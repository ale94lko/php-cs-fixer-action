// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto'
import { access, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ActionErrorCode } from './error-tracking'
import { DOWNLOADED_CONFIG, resolveConfig, rulesDownloadUrl, rulesFileName } from './resolve-config'
import { loadChecksums, resolveRulesChecksumsPath, rulesChecksumKey } from './rules-checksums'
import type { ActionInputs } from './inputs'

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function mockDownloadResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  }
}

const base: ActionInputs = {
  phpCsFixerVersion: 'v3.95.21',
  configPath: '',
  rulesVersion: 'v1.0.1',
  useFullRules: 'true',
  mode: 'check',
  paths: '',
  allowRisky: 'yes',
  phpBin: '',
  workingDirectory: '',
  usingCache: '',
  cacheFile: '',
  onlyChanged: 'false',
  baseRef: '',
  sarifFile: '',
}

describe('rules selection', () => {
  it('uses the full or minimal ruleset filename', () => {
    expect(rulesFileName('true')).toBe('.php-cs-fixer.dist.php')
    expect(rulesFileName('false')).toBe('.php-cs-fixer.dist.min.php')
  })

  it('builds the raw GitHub URL from rules-version', () => {
    expect(rulesDownloadUrl('v1.0.1', 'false')).toBe(
      'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/v1.0.1/.php-cs-fixer.dist.min.php',
    )
  })

  it('keeps slash refs under the php-cs-fixer-rules raw path', () => {
    expect(rulesDownloadUrl('release/1.0', 'true')).toBe(
      'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/release/1.0/.php-cs-fixer.dist.php',
    )
  })

  it('rejects rules-version values that URL-normalize outside the rules repo', () => {
    expect(() => rulesDownloadUrl('../../PHP-CS-Fixer/PHP-CS-Fixer/v3.64.0', 'true')).toThrow(
      /Use a tag, branch, or SHA/,
    )
  })
})

describe('resolveConfig', () => {
  it('returns a local config-path when the file exists', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await writeFile(join(workspace, 'local.php'), '<?php\n')

    await expect(
      resolveConfig({ ...base, configPath: 'local.php' }, workspace),
    ).resolves.toBe('local.php')
  })

  it('does not download php-cs-fixer-rules for the local fixture config', async () => {
    const fetchImpl = vi.fn()
    await expect(
      resolveConfig(
        { ...base, configPath: 'tests/fixtures/.php-cs-fixer.dist.php' },
        process.cwd(),
        { fetchImpl },
      ),
    ).resolves.toBe('tests/fixtures/.php-cs-fixer.dist.php')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails when config-path is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(resolveConfig({ ...base, configPath: 'missing.php' }, workspace)).rejects.toThrow(
      /was not found/,
    )
  })

  it('downloads shared rules when config-path is empty and the digest matches', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const body = '<?php return [];'
    const key = rulesChecksumKey('v1.0.1', 'false')
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse(body))
    const writeFileImpl = async (path: string, data: Buffer) => {
      await writeFile(path, data)
    }

    await expect(
      resolveConfig({ ...base, useFullRules: 'false' }, workspace, {
        fetchImpl,
        writeFileImpl,
        runtimeDir: workspace,
        rulesChecksums: new Map([[key, sha256(body)]]),
      }),
    ).resolves.toBe(join(workspace, DOWNLOADED_CONFIG))

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/v1.0.1/.php-cs-fixer.dist.min.php',
      expect.objectContaining({ redirect: 'manual' }),
    )
  })

  it('fails closed on checksum mismatch and removes the download', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const dest = join(workspace, DOWNLOADED_CONFIG)
    const key = rulesChecksumKey('v1.0.1', 'true')
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('tampered'))
    const writeFileImpl = async (path: string, data: Buffer) => {
      await writeFile(path, data)
    }

    await expect(
      resolveConfig(base, workspace, {
        fetchImpl,
        writeFileImpl,
        runtimeDir: workspace,
        rulesChecksums: new Map([[key, sha256('expected')]]),
      }),
    ).rejects.toMatchObject({ code: ActionErrorCode.ChecksumMismatch })

    await expect(access(dest)).rejects.toThrow()
  })

  it('fails closed when the rules pin is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const fetchImpl = vi.fn()

    await expect(
      resolveConfig({ ...base, rulesVersion: 'v9.9.9' }, workspace, {
        fetchImpl,
        runtimeDir: workspace,
        rulesChecksums: new Map(),
      }),
    ).rejects.toMatchObject({ code: ActionErrorCode.ChecksumMismatch })

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rethrows ActionError from rulesDownloadUrl without remapping', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const key = rulesChecksumKey('../escape', 'true')
    await expect(
      resolveConfig({ ...base, rulesVersion: '../escape' }, workspace, {
        runtimeDir: workspace,
        rulesChecksums: new Map([[key, 'a'.repeat(64)]]),
        fetchImpl: vi.fn(),
      }),
    ).rejects.toMatchObject({
      step: 'resolve-config',
      code: ActionErrorCode.InvalidInput,
    })
  })

  it('wraps download failures as DOWNLOAD_FAILED', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const key = rulesChecksumKey('v1.0.1', 'true')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => null },
    })

    await expect(
      resolveConfig(base, workspace, {
        fetchImpl,
        runtimeDir: workspace,
        rulesChecksums: new Map([[key, 'a'.repeat(64)]]),
        retries: 1,
        delayMs: 1,
      }),
    ).rejects.toMatchObject({ code: ActionErrorCode.DownloadFailed })
  })

  it('loads rules-checksums from disk when the table is not injected', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const body = '<?php return [];'
    const key = rulesChecksumKey('v1.0.1', 'true')
    const checksumsPath = join(workspace, 'rules-checksums.txt')
    await writeFile(checksumsPath, `${sha256(body)}  ${key}\n`)
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse(body))
    const writeFileImpl = async (path: string, data: Buffer) => {
      await writeFile(path, data)
    }

    await expect(
      resolveConfig(base, workspace, {
        fetchImpl,
        writeFileImpl,
        runtimeDir: workspace,
        rulesChecksumsPath: checksumsPath,
      }),
    ).resolves.toBe(join(workspace, DOWNLOADED_CONFIG))
  })

  it('uses RUNNER_TEMP when runtimeDir is omitted', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const body = '<?php return [];'
    const key = rulesChecksumKey('v1.0.1', 'true')
    const checksumsPath = join(workspace, 'rules-checksums.txt')
    await writeFile(checksumsPath, `${sha256(body)}  ${key}\n`)
    const previous = process.env.RUNNER_TEMP
    process.env.RUNNER_TEMP = workspace
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse(body))
    const writeFileImpl = async (path: string, data: Buffer) => {
      await writeFile(path, data)
    }

    try {
      const dest = await resolveConfig(base, workspace, {
        fetchImpl,
        writeFileImpl,
        rulesChecksumsPath: checksumsPath,
      })
      expect(dest).toContain(DOWNLOADED_CONFIG)
      expect(fetchImpl).toHaveBeenCalledOnce()
    } finally {
      if (previous === undefined) {
        delete process.env.RUNNER_TEMP
      } else {
        process.env.RUNNER_TEMP = previous
      }
    }
  })
})

describe('committed rules-checksums.txt', () => {
  it('pins default v1.0.1 full and min configs', async () => {
    const table = await loadChecksums(resolveRulesChecksumsPath())
    expect(table.get('v1.0.1/.php-cs-fixer.dist.php')).toMatch(/^[a-f0-9]{64}$/)
    expect(table.get('v1.0.1/.php-cs-fixer.dist.min.php')).toMatch(/^[a-f0-9]{64}$/)
  })
})
