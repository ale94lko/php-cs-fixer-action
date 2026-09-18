// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest'
import {
  buildSummaryMarkdown,
  extractJsonObject,
  firstChangedLine,
  parseViolations,
  toRepoPath,
  tryParseViolations,
} from './report'

const sampleDiff = [
  '--- a/tests/fixtures/Dirty.php',
  '+++ b/tests/fixtures/Dirty.php',
  '@@ -2,5 +2,8 @@',
  ' class foo',
  '-{',
  '+{',
  '+    public function Bar()',
].join('\n')

const sampleReport = {
  files: [
    {
      name: 'tests/fixtures/Dirty.php',
      appliedFixers: ['visibility_required', 'braces_position'],
      diff: sampleDiff,
    },
  ],
  time: { total: 0.05 },
  memory: 8,
}

describe('extractJsonObject', () => {
  it('parses JSON wrapped in fixer stderr noise', () => {
    const raw = `Loaded config\n${JSON.stringify(sampleReport)}\nDone`
    expect(extractJsonObject(raw)).toEqual(sampleReport)
  })

  it('fails when no JSON object is present', () => {
    expect(() => extractJsonObject('not json')).toThrow(/JSON report/)
  })
})

describe('firstChangedLine', () => {
  it('prefers the new (+) side of an edited-file hunk', () => {
    expect(firstChangedLine('@@ -10,3 +15,5 @@\n context\n-old\n+new\n')).toBe(15)
  })

  it('uses the + side when old and new starts match', () => {
    expect(firstChangedLine(sampleDiff)).toBe(2)
  })

  it('uses the + side for new-file hunks (@@ -0,0 +1,…)', () => {
    expect(firstChangedLine('@@ -0,0 +1,3 @@\n+<?php\n')).toBe(1)
  })

  it('falls back to the old side for pure-deletion hunks', () => {
    expect(firstChangedLine('@@ -8,2 +0,0 @@\n-gone\n')).toBe(8)
  })

  it('returns undefined without a hunk header', () => {
    expect(firstChangedLine('no hunk')).toBeUndefined()
  })
})

describe('toRepoPath', () => {
  it('strips the workspace prefix from absolute paths', () => {
    expect(toRepoPath('/work/repo/src/Foo.php', '/work/repo')).toBe('src/Foo.php')
  })

  it('keeps relative paths', () => {
    expect(toRepoPath('tests/fixtures/Dirty.php', '/work/repo')).toBe('tests/fixtures/Dirty.php')
  })
})

describe('parseViolations', () => {
  it('maps files, fixers and diff lines', () => {
    expect(parseViolations(JSON.stringify(sampleReport), '/work')).toEqual([
      {
        file: 'tests/fixtures/Dirty.php',
        fixers: ['visibility_required', 'braces_position'],
        line: 2,
        diff: sampleDiff,
      },
    ])
  })

  it('returns an empty list for a clean report', () => {
    expect(parseViolations(JSON.stringify({ files: [] }))).toEqual([])
  })

  it('ignores reports without a files array or unnamed entries', () => {
    expect(parseViolations(JSON.stringify({ time: { total: 1 } }))).toEqual([])
    expect(parseViolations(JSON.stringify({ files: [{ name: '' }, { appliedFixers: ['x'] }] }))).toEqual(
      [],
    )
  })

  it('tryParseViolations swallows invalid output', () => {
    expect(tryParseViolations('fatal: php not found')).toEqual([])
  })
})

describe('buildSummaryMarkdown', () => {
  it('lists files, fixers and counts', () => {
    const markdown = buildSummaryMarkdown(parseViolations(JSON.stringify(sampleReport)), 'check')
    expect(markdown).toContain('Found **1** file(s) with style violations.')
    expect(markdown).toContain('| File | Fixers | Count |')
    expect(markdown).toContain('`tests/fixtures/Dirty.php`')
    expect(markdown).toContain('visibility_required, braces_position')
    expect(markdown).toMatch(/\| 2 \|/)
  })

  it('describes a clean run', () => {
    expect(buildSummaryMarkdown([], 'check')).toContain('No coding standard violations found.')
  })

  it('escapes backslashes before pipes in table cells', () => {
    const markdown = buildSummaryMarkdown(
      [{ file: 'src\\foo|bar.php', fixers: ['a|b'] }],
      'check',
    )
    expect(markdown).toContain('src\\\\foo\\|bar.php')
    expect(markdown).toContain('a\\|b')
  })
})
