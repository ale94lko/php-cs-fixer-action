// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expectedChecksum, parseChecksums, resolveChecksumsPath } from './checksums'
import { DEFAULT_PHP_CS_FIXER_VERSION } from './inputs'

describe('parseChecksums', () => {
  it('maps tags to lowercase SHA-256 digests', () => {
    const table = parseChecksums(
      '# comment\n58C4AE1AF0C73B7BCB658387E88D2D60DB3181A9E93AF687E7C5594358A4CF7D  v3.95.21\n',
    )
    expect(table.get('v3.95.21')).toBe(
      '58c4ae1af0c73b7bcb658387e88d2d60db3181a9e93af687e7c5594358a4cf7d',
    )
  })

  it('rejects a malformed line', () => {
    expect(() => parseChecksums('not-a-checksum v1.0.0')).toThrow(/Invalid checksums.txt line/)
  })
})

describe('expectedChecksum', () => {
  it('fails closed when the tag is missing', () => {
    expect(() => expectedChecksum('v9.9.9', new Map())).toThrow(/No SHA-256 checksum/)
  })
})

describe('resolveChecksumsPath', () => {
  it('fails when checksums.txt is missing', () => {
    expect(() => resolveChecksumsPath('/no-such-cwd', '/no-such-dir')).toThrow(
      /checksums.txt was not found/,
    )
  })
})

describe('committed checksums.txt', () => {
  it('pins the Action default php-cs-fixer version', () => {
    const path = resolveChecksumsPath(join(__dirname, '..'), join(__dirname))
    const table = parseChecksums(readFileSync(path, 'utf8'))
    expect(table.get(DEFAULT_PHP_CS_FIXER_VERSION)).toMatch(/^[a-f0-9]{64}$/)
  })
})
