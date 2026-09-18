// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadChecksums, parseChecksums } from './checksums'

export const DEFAULT_RULES_CHECKSUMS_FILE = 'rules-checksums.txt'

export { parseChecksums, loadChecksums }

export function rulesChecksumKey(rulesVersion: string, useFullRules: string): string {
  const file =
    useFullRules === 'true' ? '.php-cs-fixer.dist.php' : '.php-cs-fixer.dist.min.php'
  return `${rulesVersion}/${file}`
}

export function resolveRulesChecksumsPath(cwd = process.cwd(), fromDir = __dirname): string {
  const candidates = [
    join(fromDir, '..', DEFAULT_RULES_CHECKSUMS_FILE),
    join(cwd, DEFAULT_RULES_CHECKSUMS_FILE),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error(
    `rules-checksums.txt was not found. Place it next to action.yml (looked in ${candidates.join(', ')}).`,
  )
}

export function expectedRulesChecksum(key: string, table: Map<string, string>): string {
  const hash = table.get(key)
  if (!hash) {
    throw new Error(
      `No SHA-256 checksum for php-cs-fixer-rules ${key}. Add it to rules-checksums.txt (see scripts/update-rules-checksums.sh).`,
    )
  }
  return hash
}
