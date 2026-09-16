import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PharCache } from '../../src/cache'
import { downloadFixer, fixerReleaseUrl } from '../../src/download-fixer'

const VERSION = 'v9.9.9-fixture'
const PHAR_BODY = '<?php // offline fixture phar\n'

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
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

describe('downloadFixer integration (loopback HTTP)', () => {
  let server: Server
  let baseUrl: string
  let requestCount = 0
  const expectedPath = `/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${VERSION}/php-cs-fixer.phar`

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

  it('downloads a fixture phar over loopback, verifies checksums.txt, and reuses cache', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-int-'))
    const checksum = sha256(PHAR_BODY)
    const checksumsPath = join(workspace, 'checksums.txt')
    await writeFile(checksumsPath, `${checksum}  ${VERSION}\n`)

    const fetchImpl: typeof fetch = async (input, init) => {
      const rewritten = String(input).replace('https://github.com', baseUrl)
      return fetch(rewritten, init)
    }
    const cache = createFileCache(workspace)

    expect(fixerReleaseUrl(VERSION)).toContain(expectedPath)

    const beforeDownload = requestCount
    const dest = await downloadFixer(VERSION, workspace, {
      fetchImpl,
      checksumsPath,
      cache,
      retries: 1,
      delayMs: 1,
    })

    expect(await readFile(dest, 'utf8')).toBe(PHAR_BODY)
    expect(requestCount).toBe(beforeDownload + 1)

    await rm(dest, { force: true })

    const beforeReuse = requestCount
    const reused = await downloadFixer(VERSION, workspace, {
      fetchImpl,
      checksumsPath,
      cache,
      retries: 1,
      delayMs: 1,
    })

    expect(await readFile(reused, 'utf8')).toBe(PHAR_BODY)
    expect(requestCount).toBe(beforeReuse)
  })
})
