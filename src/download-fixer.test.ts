import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { downloadFixer, fixerReleaseUrl } from './download-fixer'

describe('fixerReleaseUrl', () => {
  it('points at the GitHub release phar for the given tag', () => {
    expect(fixerReleaseUrl('v3.95.21')).toBe(
      'https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/v3.95.21/php-cs-fixer.phar',
    )
  })
})

describe('downloadFixer', () => {
  it('writes the phar into the workspace', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('phar').buffer,
    })

    const dest = await downloadFixer('v3.95.21', workspace, { fetchImpl })
    expect(dest).toBe(join(workspace, 'php-cs-fixer'))
    await expect(readFile(dest, 'utf8')).resolves.toBe('phar')
  })
})
