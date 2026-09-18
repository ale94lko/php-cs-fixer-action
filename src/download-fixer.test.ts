// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PharCache } from './cache'
import { downloadFixer, fixerReleaseUrl, VENDORED_PHAR_ENV } from './download-fixer'

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Minimal Response-like object for downloadToFile / readResponseBodyLimited. */
function mockDownloadResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  }
}

const noopCache: PharCache = {
  restore: async () => undefined,
  save: async () => undefined,
}

afterEach(() => {
  delete process.env[VENDORED_PHAR_ENV]
})

describe('fixerReleaseUrl', () => {
  it('points at the GitHub release phar for the given tag', () => {
    expect(fixerReleaseUrl('v3.95.21')).toBe(
      'https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/v3.95.21/php-cs-fixer.phar',
    )
  })
})

describe('downloadFixer', () => {
  it('writes the phar into the runtime dir after a matching checksum', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('phar'))
    const save = vi.fn()

    const dest = await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: { restore: async () => undefined, save },
    })
    expect(dest).toBe(join(workspace, 'php-cs-fixer'))
    await expect(readFile(dest, 'utf8')).resolves.toBe('phar')
    expect(save).toHaveBeenCalledWith('v3.95.21', sha256('phar'), dest)
  })

  it('fails closed on checksum mismatch and removes the download', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const dest = join(workspace, 'php-cs-fixer')
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('tampered'))

    await expect(
      downloadFixer('v3.95.21', workspace, {
        fetchImpl,
        checksums: new Map([['v3.95.21', sha256('phar')]]),
        cache: noopCache,
      }),
    ).rejects.toThrow(/Checksum mismatch for php-cs-fixer v3\.95\.21/)

    await expect(access(dest)).rejects.toThrow()
  })

  it('fails closed when the version has no committed checksum', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(
      downloadFixer('v0.0.0', workspace, {
        checksums: new Map(),
        cache: noopCache,
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow(/No SHA-256 checksum for php-cs-fixer v0\.0\.0/)
  })

  it('reuses a cached phar without downloading', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const cached = join(workspace, 'cached-phar')
    await writeFile(cached, 'phar')
    const fetchImpl = vi.fn()

    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: {
        restore: async () => cached,
        save: vi.fn(),
      },
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    await expect(readFile(join(workspace, 'php-cs-fixer'), 'utf8')).resolves.toBe('phar')
  })

  it('redownloads when a cached file fails the checksum', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const cached = join(workspace, 'cached-phar')
    await writeFile(cached, 'stale')
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('phar'))

    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: {
        restore: async () => cached,
        save: vi.fn(),
      },
    })

    expect(fetchImpl).toHaveBeenCalledOnce()
    await expect(readFile(join(workspace, 'php-cs-fixer'), 'utf8')).resolves.toBe('phar')
  })

  it('fails closed when the download fails', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(
      downloadFixer('v3.95.21', workspace, {
        fetchImpl: vi.fn().mockResolvedValue(mockDownloadResponse('', 500)),
        checksums: new Map([['v3.95.21', sha256('phar')]]),
        cache: noopCache,
        retries: 1,
        delayMs: 1,
      }),
    ).rejects.toThrow(/Download failed \(500\)/)
  })

  it('reuses a runtime-dir phar with a matching checksum without downloading', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const dest = join(workspace, 'php-cs-fixer')
    await writeFile(dest, 'phar')
    const fetchImpl = vi.fn()
    const restore = vi.fn()

    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: { restore, save: vi.fn() },
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(restore).not.toHaveBeenCalled()
    await expect(readFile(dest, 'utf8')).resolves.toBe('phar')
  })

  it('reuses PHP_CS_FIXER_PHAR without downloading', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const vendored = join(workspace, 'vendored.phar')
    await writeFile(vendored, 'phar')
    process.env[VENDORED_PHAR_ENV] = vendored
    const fetchImpl = vi.fn()

    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: noopCache,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    await expect(readFile(join(workspace, 'php-cs-fixer'), 'utf8')).resolves.toBe('phar')
  })

  it('downloads when a vendored phar fails the checksum', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const vendored = join(workspace, 'vendored.phar')
    await writeFile(vendored, 'stale')
    process.env[VENDORED_PHAR_ENV] = vendored
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('phar'))

    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksums: new Map([['v3.95.21', sha256('phar')]]),
      cache: noopCache,
    })

    expect(fetchImpl).toHaveBeenCalledOnce()
    await expect(readFile(join(workspace, 'php-cs-fixer'), 'utf8')).resolves.toBe('phar')
  })

  it('loads checksums.txt when no table is injected', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const checksumsPath = join(workspace, 'checksums.txt')
    await writeFile(checksumsPath, `${sha256('phar')}  v3.95.21\n`)
    const fetchImpl = vi.fn().mockResolvedValue(mockDownloadResponse('phar'))
    await downloadFixer('v3.95.21', workspace, {
      fetchImpl,
      checksumsPath,
      cache: noopCache,
    })
    await expect(readFile(join(workspace, 'php-cs-fixer'), 'utf8')).resolves.toBe('phar')
  })
})
