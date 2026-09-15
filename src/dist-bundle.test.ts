import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const {
  assertDistIsFresh,
  canonicalizeDistFiles,
  canonicalizeDistText,
  injectSourceHash,
  readSourceHash,
  sourceHash,
} = createRequire(join(process.cwd(), 'package.json'))('./scripts/dist-bundle.cjs') as {
  assertDistIsFresh: (root: string) => void
  canonicalizeDistFiles: (distDir: string) => void
  canonicalizeDistText: (text: string) => string
  injectSourceHash: (text: string, hash: string) => string
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
})
