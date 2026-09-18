// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const {
  assertDistIsFresh,
  assertNoWebpackMissingModule,
  canonicalizeDistFiles,
  canonicalizeDistText,
  injectSourceHash,
  normalizeDist,
  readSourceHash,
  sourceHash,
} = createRequire(join(process.cwd(), 'package.json'))('./scripts/dist-bundle.cjs') as {
  assertDistIsFresh: (root: string) => void
  assertNoWebpackMissingModule: (text: string) => void
  canonicalizeDistFiles: (distDir: string) => void
  canonicalizeDistText: (text: string) => string
  injectSourceHash: (text: string, hash: string) => string
  normalizeDist: (root: string) => void
  readSourceHash: (text: string) => string | undefined
  sourceHash: (root: string) => string
}

describe('canonicalizeDistText', () => {
  it('converts CRLF to LF', () => {
    expect(canonicalizeDistText('a\r\nb\r\n')).toBe('a\nb\n')
  })

  it('strips vendor sourceMappingURL comments and extra blank lines', () => {
    expect(
      canonicalizeDistText(
        'class Foo {}\n//# sourceMappingURL=Foo.js.map\n\n\n/***/ })\n',
      ),
    ).toBe('class Foo {}\n\n/***/ })\n')
  })
})

describe('canonicalizeDistFiles', () => {
  it('rewrites js and licenses, and only LF-normalizes other files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'canonicalize-dist-'))
    try {
      await writeFile(join(dir, 'index.js'), 'ok\r\n//# sourceMappingURL=x.js.map\r\n')
      await writeFile(join(dir, 'licenses'), 'MIT\r\n')
      await writeFile(join(dir, 'index.js.map'), '{"file":"index.js"}\r\n')

      canonicalizeDistFiles(dir)

      expect(await readFile(join(dir, 'index.js'), 'utf8')).toBe('ok\n')
      expect(await readFile(join(dir, 'licenses'), 'utf8')).toBe('MIT\n')
      expect(await readFile(join(dir, 'index.js.map'), 'utf8')).toBe('{"file":"index.js"}\n')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('source hash freshness', () => {
  it('embeds and reads a stable hash banner', () => {
    const hash = sourceHash(process.cwd())
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    const bundled = injectSourceHash('require("./runtime.js");\n', hash)
    expect(readSourceHash(bundled)).toBe(hash)
    expect(injectSourceHash(bundled, 'a'.repeat(64))).toContain('// php-cs-fixer-action-src-hash ')
    expect(injectSourceHash(bundled, 'a'.repeat(64)).startsWith('// php-cs-fixer-action-src-hash aaaa')).toBe(
      true,
    )
  })

  it('rejects a stale dist banner', () => {
    expect(() =>
      assertDistIsFresh(join(tmpdir(), 'missing-php-cs-fixer-action-root')),
    ).toThrow()
  })

  it('rejects a bundle that ncc failed to resolve', () => {
    expect(() =>
      assertNoWebpackMissingModule(
        'const cache = __nccwpck_require__(Object(function webpackMissingModule() { throw new Error("Cannot find module") }()))',
      ),
    ).toThrow(/webpackMissingModule/)
    expect(() => assertNoWebpackMissingModule('const cache = require("./cache.js")\n')).not.toThrow()
  })
})

describe('normalizeDist', () => {
  it('canonicalizes dist text files and injects the src-hash banner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'normalize-dist-'))
    try {
      await mkdir(join(root, 'src'), { recursive: true })
      await mkdir(join(root, 'dist'), { recursive: true })
      await writeFile(join(root, 'src', 'index.ts'), 'export {}\n')
      await writeFile(join(root, 'package.json'), '{"name":"fixture"}\n')
      await writeFile(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n')
      await writeFile(join(root, 'action.inputs.schema.json'), '{}\n')
      await writeFile(
        join(root, 'dist', 'index.js'),
        'module.exports = {}\r\n\r\n\r\n//# sourceMappingURL=index.js.map\r\n',
      )
      await writeFile(join(root, 'dist', 'licenses'), 'MIT\r\n')

      normalizeDist(root)

      const index = await readFile(join(root, 'dist', 'index.js'), 'utf8')
      const expected = sourceHash(root)
      expect(readSourceHash(index)).toBe(expected)
      expect(index).toContain('module.exports = {}')
      expect(index).not.toContain('sourceMappingURL')
      expect(index).not.toContain('\r')
      expect(await readFile(join(root, 'dist', 'licenses'), 'utf8')).toBe('MIT\n')
      expect(() => assertDistIsFresh(root)).not.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('normalize-dist.cjs delegates to normalizeDist for the repo root', () => {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const wrapper = require('node:fs').readFileSync(
      join(process.cwd(), 'scripts/normalize-dist.cjs'),
      'utf8',
    )
    expect(wrapper).toMatch(/normalizeDist\(/)
    expect(wrapper).toMatch(/dist-bundle\.cjs/)
  })
})
