// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionError } from './error-tracking'
import {
  filterPhpPaths,
  listChangedPhpPaths,
  normalizeRepoPath,
  resolveDiffBaseRef,
  restrictToPathFilters,
} from './changed-paths'

const originalBaseRef = process.env.GITHUB_BASE_REF

afterEach(() => {
  if (originalBaseRef === undefined) {
    delete process.env.GITHUB_BASE_REF
  } else {
    process.env.GITHUB_BASE_REF = originalBaseRef
  }
})

describe('normalizeRepoPath', () => {
  it('normalizes separators and drops leading ./', () => {
    expect(normalizeRepoPath('.\\src\\Foo.php')).toBe('src/Foo.php')
    expect(normalizeRepoPath('./src/Foo.php')).toBe('src/Foo.php')
  })
})

describe('filterPhpPaths', () => {
  it('keeps PHP files and drops others', () => {
    expect(
      filterPhpPaths(['src/A.php', 'README.md', 'tests\\B.PHP', '', '  lib/c.php  ']),
    ).toEqual(['src/A.php', 'tests/B.PHP', 'lib/c.php'])
  })
})

describe('restrictToPathFilters', () => {
  it('returns all changed files when filters are empty', () => {
    expect(restrictToPathFilters(['a.php', 'b.php'], [])).toEqual(['a.php', 'b.php'])
  })

  it('keeps files matching a filter path or under it', () => {
    expect(
      restrictToPathFilters(['src/A.php', 'tests/B.php', 'src/nested/C.php'], ['src', 'tests/B.php']),
    ).toEqual(['src/A.php', 'tests/B.php', 'src/nested/C.php'])
  })
})

describe('resolveDiffBaseRef', () => {
  it('prefers an explicit base-ref', () => {
    process.env.GITHUB_BASE_REF = 'main'
    expect(resolveDiffBaseRef('origin/develop')).toBe('origin/develop')
  })

  it('falls back to origin/$GITHUB_BASE_REF', () => {
    process.env.GITHUB_BASE_REF = 'main'
    expect(resolveDiffBaseRef('')).toBe('origin/main')
  })

  it('fails closed when neither base-ref nor GITHUB_BASE_REF is set', () => {
    delete process.env.GITHUB_BASE_REF
    expect(() => resolveDiffBaseRef('')).toThrow(ActionError)
    expect(() => resolveDiffBaseRef('')).toThrow(/base-ref/)
  })
})

describe('listChangedPhpPaths', () => {
  it('runs git diff and returns filtered PHP paths', async () => {
    const gitExec = vi.fn().mockResolvedValue('src/A.php\nREADME.md\ntests/B.php\n')
    await expect(
      listChangedPhpPaths({
        baseRef: 'origin/main',
        pathFilters: ['src'],
        gitExec,
      }),
    ).resolves.toEqual(['src/A.php'])
    expect(gitExec).toHaveBeenCalledWith(
      ['diff', '--name-only', '--diff-filter=ACMR', 'origin/main...HEAD'],
      expect.any(String),
    )
  })

  it('wraps git failures as InvalidInput', async () => {
    const gitExec = vi.fn().mockRejectedValue(new Error('not a git repository'))
    await expect(listChangedPhpPaths({ baseRef: 'main', gitExec })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })
})

describe('defaultGitExec', () => {
  it('returns stdout for a successful git command', async () => {
    const { defaultGitExec } = await import('./changed-paths')
    await expect(defaultGitExec(['rev-parse', '--is-inside-work-tree'], process.cwd())).resolves.toMatch(
      /true/,
    )
  })

  it('rejects when git exits non-zero', async () => {
    const { defaultGitExec } = await import('./changed-paths')
    await expect(defaultGitExec(['rev-parse', 'definitely-missing-ref-zzz'], process.cwd())).rejects.toThrow(
      /git/,
    )
  })
})
