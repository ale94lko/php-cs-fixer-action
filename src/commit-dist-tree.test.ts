// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  CommitDistError,
  api,
  assertDistDir,
  distFiles,
  encodePathSegment,
  env,
  fail,
  runCommitDistTree,
} from '../scripts/commit-dist-tree.mjs'

describe('encodePathSegment', () => {
  it('encodes each path segment for the GitHub API', () => {
    expect(encodePathSegment('ale94lko/php-cs-fixer-action')).toBe('ale94lko/php-cs-fixer-action')
    expect(encodePathSegment('feat/a b')).toBe('feat/a%20b')
    expect(encodePathSegment('org/repo-name')).toBe('org/repo-name')
  })
})

describe('env', () => {
  it('returns trimmed values and fails when missing', () => {
    expect(env('TOKEN', { TOKEN: '  abc  ' })).toBe('abc')
    expect(() => env('TOKEN', {})).toThrow(CommitDistError)
    expect(() => env('TOKEN', { TOKEN: '   ' })).toThrow(/TOKEN is required/)
  })
})

describe('fail', () => {
  it('throws CommitDistError', () => {
    expect(() => fail('boom')).toThrow(CommitDistError)
    expect(() => fail('boom')).toThrow(/boom/)
  })
})

describe('distFiles', () => {
  it('lists nested files with repo-relative posix paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dist-files-'))
    try {
      await mkdir(join(root, 'nested'), { recursive: true })
      await writeFile(join(root, 'index.js'), 'ok\n')
      await writeFile(join(root, 'nested', 'extra.js'), 'extra\n')
      expect(distFiles(root).map(([rel]) => rel)).toEqual(['index.js', 'nested/extra.js'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fails when the directory is empty', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dist-empty-'))
    try {
      expect(() => distFiles(root)).toThrow(/No files found/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('assertDistDir', () => {
  it('rejects a missing directory', () => {
    expect(() => assertDistDir(join(tmpdir(), 'missing-dist-dir-xyz'))).toThrow(/not a directory/)
  })

  it('rejects a missing index.js', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dist-no-index-'))
    try {
      expect(() => assertDistDir(root)).toThrow(/Missing/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects a bundle with webpackMissingModule', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dist-bad-'))
    try {
      await writeFile(join(root, 'index.js'), 'webpackMissingModule\n')
      expect(() => assertDistDir(root)).toThrow(/webpackMissingModule/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('accepts a clean index.js', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dist-ok-'))
    try {
      await writeFile(join(root, 'index.js'), 'module.exports = {}\n')
      expect(assertDistDir(root)).toContain('module.exports')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('api', () => {
  it('parses JSON on success and fails on HTTP errors', async () => {
    const ok = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"sha":"abc"}',
    })
    await expect(api('token', 'GET', '/repos/o/r/git/commits/1', undefined, ok)).resolves.toEqual({
      sha: 'abc',
    })

    const bad = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'missing',
    })
    await expect(api('token', 'GET', '/repos/o/r/git/commits/1', undefined, bad)).rejects.toThrow(
      /failed \(404\)/,
    )
  })

  it('returns an empty object for an empty success body', async () => {
    const ok = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    })
    await expect(api('token', 'DELETE', '/x', undefined, ok)).resolves.toEqual({})
  })
})

describe('runCommitDistTree', () => {
  it('posts blobs and updates the branch when the tree changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'commit-dist-'))
    const messages: string[] = []
    try {
      await writeFile(join(root, 'index.js'), 'module.exports = {}\n')

      const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        if (method === 'GET' && url.includes('/git/commits/')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ tree: { sha: 'parent-tree' } }),
          }
        }
        if (method === 'POST' && url.endsWith('/git/blobs')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ sha: 'blob-1' }),
          }
        }
        if (method === 'POST' && url.endsWith('/git/trees')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ sha: 'new-tree' }),
          }
        }
        if (method === 'POST' && url.endsWith('/git/commits')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ sha: 'commit-1' }),
          }
        }
        if (method === 'PATCH' && url.includes('/git/refs/heads/')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ref: 'refs/heads/main' }),
          }
        }
        throw new Error(`unexpected ${method} ${url}`)
      })

      const result = await runCommitDistTree({
        envSource: {
          DIST_DIR: root,
          GH_TOKEN: 'token',
          GITHUB_REPOSITORY: 'ale94lko/php-cs-fixer-action',
          BRANCH: 'main',
          PARENT_SHA: 'parent',
        },
        fetchImpl: fetchImpl as unknown as typeof fetch,
        log: (message) => messages.push(message),
      })

      expect(result).toEqual({ updated: true, sha: 'commit-1' })
      expect(messages).toEqual(['Updated main with commit-1'])
      expect(fetchImpl).toHaveBeenCalled()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('skips the commit when the tree is unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'commit-dist-same-'))
    const messages: string[] = []
    try {
      await writeFile(join(root, 'index.js'), 'module.exports = {}\n')

      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        if (method === 'GET') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ tree: { sha: 'same-tree' } }),
          }
        }
        if (method === 'POST' && String(_url).endsWith('/git/blobs')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ sha: 'blob-1' }),
          }
        }
        if (method === 'POST' && String(_url).endsWith('/git/trees')) {
          return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ sha: 'same-tree' }),
          }
        }
        throw new Error(`unexpected ${method} ${_url}`)
      })

      const result = await runCommitDistTree({
        envSource: {
          DIST_DIR: root,
          GH_TOKEN: 'token',
          GITHUB_REPOSITORY: 'org/repo',
          BRANCH: 'main',
          PARENT_SHA: 'parent',
        },
        fetchImpl: fetchImpl as unknown as typeof fetch,
        log: (message) => messages.push(message),
      })

      expect(result).toEqual({ updated: false })
      expect(messages).toEqual(['dist/ already up to date'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fails closed without calling fetch when env is incomplete', async () => {
    const root = await mkdtemp(join(tmpdir(), 'commit-dist-env-'))
    const fetchImpl = vi.fn()
    try {
      await writeFile(join(root, 'index.js'), 'module.exports = {}\n')
      await expect(
        runCommitDistTree({
          envSource: { DIST_DIR: root },
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
      ).rejects.toThrow(/GH_TOKEN is required/)
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
