#!/usr/bin/env node
const { readdirSync, readFileSync, statSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

function canonicalizeDistText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[ \t]*\/\/# sourceMappingURL=.*(?:\n|$)/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '\n')
}

const dist = join(__dirname, '..', 'dist')

for (const name of readdirSync(dist)) {
  const path = join(dist, name)
  if (!statSync(path).isFile()) {
    continue
  }

  const original = readFileSync(path, 'utf8')
  const next =
    name.endsWith('.js') || name === 'licenses'
      ? canonicalizeDistText(original)
      : original.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  if (next !== original) {
    writeFileSync(path, next)
  }
}
