import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canonicalizeDistFiles, canonicalizeDistText } from './canonicalize-dist'

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

  it('trims trailing whitespace', () => {
    expect(canonicalizeDistText('foo  \nbar\t\n')).toBe('foo\nbar\n')
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
