// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

#!/usr/bin/env node
/**
 * Print a top-level JSON string field from a file.
 * Usage: node scripts/read-json-field.mjs <file> <field>
 *
 * Reads from a path (not stdin) so curl is never piped into the interpreter
 * (Scorecard Pinned-Dependencies downloadThenRun).
 */
import { readFileSync } from 'node:fs'

const [, , file, field] = process.argv
if (!file || !field) {
  console.error('Usage: node scripts/read-json-field.mjs <file> <field>')
  process.exit(1)
}

const data = JSON.parse(readFileSync(file, 'utf8'))
const value = data[field]
if (typeof value !== 'string' || value === '') {
  console.error(`Missing string field '${field}' in ${file}`)
  process.exit(1)
}
process.stdout.write(`${value}\n`)
