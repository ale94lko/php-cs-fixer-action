// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as actionsCache from '@actions/cache'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertChecksum, cacheDir, cacheKey, createGithubPharCache, sha256Buffer } from './cache'

describe('cache helpers', () => {
  it('builds a version+hash cache key', () => {
    expect(cacheKey('v3.95.21', 'abc')).toBe('php-cs-fixer-phar-v3.95.21-abc')
  })

  it('hashes buffers with SHA-256', () => {
    expect(sha256Buffer(Buffer.from('phar'))).toBe(
      createHash('sha256').update('phar').digest('hex'),
    )
  })

  it('fails closed on a digest mismatch', () => {
    expect(() => assertChecksum('aaa', 'bbb', 'php-cs-fixer v3.95.21')).toThrow(
      /Checksum mismatch for php-cs-fixer v3\.95\.21/,
    )
  })
})

describe('createGithubPharCache', () => {
  afterEach(() => {
    vi.mocked(actionsCache.isFeatureAvailable).mockReturnValue(false)
    vi.mocked(actionsCache.restoreCache).mockReset()
    vi.mocked(actionsCache.saveCache).mockReset()
  })

  it('skips GitHub cache when the service is unavailable', async () => {
    const cache = createGithubPharCache()
    await expect(cache.restore('v3.95.21', 'abc')).resolves.toBeUndefined()
    await expect(cache.save('v3.95.21', 'abc', 'missing')).resolves.toBeUndefined()
    expect(actionsCache.restoreCache).not.toHaveBeenCalled()
    expect(actionsCache.saveCache).not.toHaveBeenCalled()
  })

  it('returns undefined when restoreCache misses', async () => {
    vi.mocked(actionsCache.isFeatureAvailable).mockReturnValue(true)
    vi.mocked(actionsCache.restoreCache).mockResolvedValue(undefined)
    await expect(createGithubPharCache().restore('v3.95.21', 'abc')).resolves.toBeUndefined()
  })

  it('returns the cached binary path on a restore hit', async () => {
    vi.mocked(actionsCache.isFeatureAvailable).mockReturnValue(true)
    vi.mocked(actionsCache.restoreCache).mockResolvedValue('php-cs-fixer-phar-v3.95.21-abc')
    const cache = createGithubPharCache()
    await expect(cache.restore('v3.95.21', 'abc')).resolves.toBe(
      join(cacheDir('v3.95.21', 'abc'), 'php-cs-fixer'),
    )
  })

  it('saves the phar directory to the Actions cache', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const phar = join(workspace, 'php-cs-fixer')
    await writeFile(phar, 'phar')
    vi.mocked(actionsCache.isFeatureAvailable).mockReturnValue(true)
    vi.mocked(actionsCache.saveCache).mockResolvedValue(1)
    await createGithubPharCache().save('v3.95.21', 'abc', phar)
    expect(actionsCache.saveCache).toHaveBeenCalledWith(
      [cacheDir('v3.95.21', 'abc')],
      'php-cs-fixer-phar-v3.95.21-abc',
    )
  })

  it('treats restore/save errors as a cache miss', async () => {
    vi.mocked(actionsCache.isFeatureAvailable).mockReturnValue(true)
    vi.mocked(actionsCache.restoreCache).mockRejectedValue(new Error('no token'))
    vi.mocked(actionsCache.saveCache).mockRejectedValue(new Error('read-only'))
    const cache = createGithubPharCache()
    await expect(cache.restore('v3.95.21', 'abc')).resolves.toBeUndefined()
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const phar = join(workspace, 'php-cs-fixer')
    await writeFile(phar, 'phar')
    await expect(cache.save('v3.95.21', 'abc', phar)).resolves.toBeUndefined()
  })
})
