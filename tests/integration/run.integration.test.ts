// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PharCache } from '../../src/cache'
import { downloadFixer } from '../../src/download-fixer'
import type { ActionInputs } from '../../src/inputs'
import { resolveConfig } from '../../src/resolve-config'
import { run } from '../../src/run'
import { runFixer, type FixerResult, type RunFixerSettings } from '../../src/run-fixer'

const VERSION = 'v9.9.9'
const PHAR_BODY = '<?php // offline fixture phar for run() integration\n'
const DIRTY_PHP = `<?php
class foo{
function Bar(){
$x=1;
}
}
`
const FIXED_PHP = `<?php

class Foo
{
    public function Bar()
    {
        $x = 1;
    }
}
`

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  summary: {
    addRaw: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  },
}))

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** True only for https://github.com/... (not github.com.evil.example). */
function isHttpsGithubCom(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'github.com'
  } catch {
    return false
  }
}

/** Rewrite https://github.com/... to the loopback fixture origin. */
function rewriteGithubHostToLoopback(input: string, loopbackBase: string): string {
  try {
    const parsed = new URL(input)
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
      return input
    }
    const loopback = new URL(loopbackBase)
    parsed.protocol = loopback.protocol
    parsed.host = loopback.host
    return parsed.toString()
  } catch {
    return input
  }
}

function createFileCache(root: string): PharCache {
  const store = new Map<string, string>()
  return {
    async restore(version, hash) {
      return store.get(`${version}:${hash}`)
    },
    async save(version, hash, filePath) {
      const cached = join(root, `cached-${version}-${hash.slice(0, 8)}`)
      await writeFile(cached, await readFile(filePath))
      store.set(`${version}:${hash}`, cached)
    },
  }
}

function violationReport(file: string): string {
  return JSON.stringify({
    files: [
      {
        name: file,
        appliedFixers: ['visibility_required', 'class_definition'],
        diff: '@@ -1,6 +1,10 @@\n <?php\n',
      },
    ],
  })
}

describe('run() integration (loopback download + fixture pipeline)', () => {
  let server: Server
  let baseUrl: string
  let requestCount = 0
  const expectedPath = `/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${VERSION}/php-cs-fixer.phar`
  const originalSummary = process.env.GITHUB_STEP_SUMMARY
  const fixtureConfig = join(process.cwd(), 'tests/fixtures/.php-cs-fixer.dist.php')

  beforeAll(async () => {
    server = createServer((req, res) => {
      requestCount += 1
      if (req.url === expectedPath) {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        res.end(PHAR_BODY)
        return
      }
      res.writeHead(404)
      res.end('not found')
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })

    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP listen address for the fixture server')
    }
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  beforeEach(() => {
    process.env.GITHUB_STEP_SUMMARY = join(tmpdir(), 'run-int-summary.md')
  })

  afterEach(() => {
    vi.clearAllMocks()
    process.exitCode = undefined
    if (originalSummary === undefined) {
      delete process.env.GITHUB_STEP_SUMMARY
    } else {
      process.env.GITHUB_STEP_SUMMARY = originalSummary
    }
  })

  async function prepareWorkspace(): Promise<{
    workspace: string
    dirtyRel: string
    inputs: ActionInputs
    deps: Parameters<typeof run>[0]
  }> {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-run-int-'))
    const checksumsPath = join(workspace, 'checksums.txt')
    await writeFile(checksumsPath, `${sha256(PHAR_BODY)}  ${VERSION}\n`)

    const configRel = '.php-cs-fixer.dist.php'
    await copyFile(fixtureConfig, join(workspace, configRel))

    const dirtyRel = 'Dirty.php'
    await writeFile(join(workspace, dirtyRel), DIRTY_PHP)

    const fetchImpl: typeof fetch = async (input, init) => {
      const rewritten = rewriteGithubHostToLoopback(String(input), baseUrl)
      return fetch(rewritten, init)
    }
    const cache = createFileCache(workspace)

    const inputs: ActionInputs = {
      phpCsFixerVersion: VERSION,
      configPath: configRel,
      rulesVersion: 'unused',
      useFullRules: 'true',
      mode: 'check',
      paths: dirtyRel,
      allowRisky: 'yes',
      phpBin: '',
      workingDirectory: '',
      usingCache: '',
      cacheFile: '',
      onlyChanged: 'false',
      baseRef: '',
      sarifFile: '',
    }

    const deps: Parameters<typeof run>[0] = {
      readInputs: () => inputs,
      downloadFixer: (version) =>
        downloadFixer(version, workspace, {
          fetchImpl,
          checksumsPath,
          cache,
          retries: 1,
          delayMs: 1,
        }),
      resolveConfig: (value) => resolveConfig(value, workspace),
      runFixer: (configFile, settings: RunFixerSettings = {}) => {
        const mode = settings.mode ?? 'check'
        return runFixer(configFile, {
          ...settings,
          workspace,
          runtimeDir: workspace,
          runProcess: async (): Promise<FixerResult> => {
            if (mode === 'fix') {
              await writeFile(join(workspace, dirtyRel), FIXED_PHP)
              return { exitCode: 0, output: violationReport(dirtyRel) }
            }
            return { exitCode: 8, output: violationReport(dirtyRel) }
          },
        })
      },
    }

    return { workspace, dirtyRel, inputs, deps }
  }

  it('mode check: downloads over loopback, annotates violations, exits 1', async () => {
    const core = await import('@actions/core')
    const { workspace, dirtyRel, deps } = await prepareWorkspace()
    const before = requestCount

    try {
      await run(deps)

      expect(requestCount).toBe(before + 1)
      expect(await readFile(join(workspace, 'php-cs-fixer'), 'utf8')).toBe(PHAR_BODY)
      expect(await readFile(join(workspace, dirtyRel), 'utf8')).toBe(DIRTY_PHP)
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('visibility_required'),
        expect.objectContaining({
          file: dirtyRel,
          title: 'PHP CS Fixer',
        }),
      )
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(process.exitCode).toBe(1)
      expect(core.setOutput).toHaveBeenCalledWith(
        'code-style-result',
        expect.stringContaining('Dirty.php'),
      )
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  it('mode fix: downloads over loopback and rewrites the dirty fixture', async () => {
    const core = await import('@actions/core')
    const { workspace, dirtyRel, inputs, deps } = await prepareWorkspace()
    inputs.mode = 'fix'
    const before = requestCount

    try {
      await run(deps)

      expect(requestCount).toBe(before + 1)
      expect(await readFile(join(workspace, dirtyRel), 'utf8')).toBe(FIXED_PHP)
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('visibility_required'),
        expect.objectContaining({ file: dirtyRel }),
      )
      expect(core.error).not.toHaveBeenCalled()
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(process.exitCode).not.toBe(1)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  it('does not hit live GitHub Releases for the happy path', async () => {
    const { workspace, deps } = await prepareWorkspace()
    const liveFetch = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input, init) => {
      const url = String(input)
      if (isHttpsGithubCom(url)) {
        liveFetch(url)
      }
      return originalFetch(input, init)
    }) as typeof fetch

    try {
      await run(deps)
      expect(liveFetch).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
      await rm(workspace, { recursive: true, force: true })
    }
  })
})
