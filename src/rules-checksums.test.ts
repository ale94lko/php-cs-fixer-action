// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest'
import {
  expectedRulesChecksum,
  loadChecksums,
  resolveRulesChecksumsPath,
  rulesChecksumKey,
} from './rules-checksums'

describe('rulesChecksumKey', () => {
  it('keys by tag and rules filename', () => {
    expect(rulesChecksumKey('v1.0.1', 'true')).toBe('v1.0.1/.php-cs-fixer.dist.php')
    expect(rulesChecksumKey('v1.0.1', 'false')).toBe('v1.0.1/.php-cs-fixer.dist.min.php')
  })
})

describe('expectedRulesChecksum', () => {
  it('returns the pinned digest', () => {
    const digest = 'a'.repeat(64)
    const table = new Map([['v1.0.1/.php-cs-fixer.dist.php', digest]])
    expect(expectedRulesChecksum('v1.0.1/.php-cs-fixer.dist.php', table)).toBe(digest)
  })

  it('fails closed when the pin is missing', () => {
    expect(() => expectedRulesChecksum('v9.9.9/.php-cs-fixer.dist.php', new Map())).toThrow(
      /No SHA-256 checksum for php-cs-fixer-rules/,
    )
  })
})

describe('committed rules-checksums.txt', () => {
  it('is loadable next to action.yml', async () => {
    const table = await loadChecksums(resolveRulesChecksumsPath())
    expect(table.size).toBeGreaterThanOrEqual(2)
  })
})
