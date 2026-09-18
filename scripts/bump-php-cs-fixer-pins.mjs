// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

#!/usr/bin/env node
/**
 * Rewrite pinned php-cs-fixer version strings after checksums.txt is updated.
 * Env: OLD_TAG, NEW_TAG (vX.Y.Z).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const oldTag = (process.env.OLD_TAG ?? '').trim()
const newTag = (process.env.NEW_TAG ?? '').trim()
if (!oldTag || !newTag) {
  fail('OLD_TAG and NEW_TAG are required')
}

const root = process.cwd()

function patchFile(rel, pattern, buildReplacement) {
  const path = join(root, rel)
  const text = readFileSync(path, 'utf8')
  let n = 0
  const updated = text.replace(pattern, (...args) => {
    n += 1
    return buildReplacement(...args)
  })
  if (n !== 1) {
    fail(`failed to patch ${rel} (${n} replacements)`)
  }
  writeFileSync(path, updated, 'utf8')
}

patchFile(
  'src/inputs.ts',
  /(DEFAULT_PHP_CS_FIXER_VERSION = ')[^']+(')/,
  (_match, a, b) => `${a}${newTag}${b}`,
)

patchFile(
  'action.yml',
  /(php-cs-fixer-version:\n(?:.*\n)*?    default: )'[^']+'/,
  (_match, prefix) => `${prefix}'${newTag}'`,
)

for (const rel of [
  'README.md',
  'CONTRIBUTING.md',
  'Dockerfile',
  '.env.example',
  'scripts/ci-local.sh',
  'scripts/vendor-php-cs-fixer.sh',
]) {
  const path = join(root, rel)
  const text = readFileSync(path, 'utf8')
  writeFileSync(path, text.replaceAll(oldTag, newTag), 'utf8')
}
