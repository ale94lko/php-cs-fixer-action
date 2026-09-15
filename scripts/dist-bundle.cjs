#!/usr/bin/env node
const { createHash } = require('node:crypto')
const { readdirSync, readFileSync, statSync, writeFileSync } = require('node:fs')
const { join, relative } = require('node:path')

const SOURCE_HASH_MARKER = 'php-cs-fixer-action-src-hash'
const BANNER = new RegExp(`^// ${SOURCE_HASH_MARKER} [a-f0-9]{64}\\n`)

function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      listFiles(path, acc)
      continue
    }
    acc.push(path)
  }
  return acc
}

function hashedSourceFiles(root) {
  const sources = listFiles(join(root, 'src')).filter((path) => {
    const name = path.replace(/\\/g, '/')
    return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('/test-setup.ts')
  })
  return [...sources, join(root, 'package.json'), join(root, 'package-lock.json')].sort((a, b) =>
    a.replace(/\\/g, '/').localeCompare(b.replace(/\\/g, '/')),
  )
}

function sourceHash(root) {
  const hash = createHash('sha256')
  for (const path of hashedSourceFiles(root)) {
    hash.update(relative(root, path).replace(/\\/g, '/'))
    hash.update('\0')
    hash.update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function injectSourceHash(text, hash) {
  const banner = `// ${SOURCE_HASH_MARKER} ${hash}\n`
  return banner + text.replace(BANNER, '')
}

function readSourceHash(text) {
  const match = text.match(/^\/\/ php-cs-fixer-action-src-hash ([a-f0-9]{64})\n/)
  return match ? match[1] : undefined
}

function canonicalizeDistText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[ \t]*\/\/# sourceMappingURL=.*(?:\n|$)/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '\n')
}

function canonicalizeDistFiles(distDir) {
  for (const name of readdirSync(distDir)) {
    const path = join(distDir, name)
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
}

function normalizeDist(root) {
  const distDir = join(root, 'dist')
  canonicalizeDistFiles(distDir)
  const indexPath = join(distDir, 'index.js')
  const body = readFileSync(indexPath, 'utf8')
  writeFileSync(indexPath, injectSourceHash(body, sourceHash(root)))
}

function assertDistIsFresh(root) {
  const expected = sourceHash(root)
  const found = readSourceHash(readFileSync(join(root, 'dist/index.js'), 'utf8'))
  if (found !== expected) {
    throw new Error(
      `dist/index.js is stale (src-hash ${found ?? 'missing'}, expected ${expected}). Run npm run build and commit dist/.`,
    )
  }
}

module.exports = {
  SOURCE_HASH_MARKER,
  assertDistIsFresh,
  canonicalizeDistFiles,
  canonicalizeDistText,
  injectSourceHash,
  normalizeDist,
  readSourceHash,
  sourceHash,
}

if (require.main === module) {
  normalizeDist(join(__dirname, '..'))
}
