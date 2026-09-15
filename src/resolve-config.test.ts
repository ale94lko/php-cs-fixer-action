import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DOWNLOADED_CONFIG, resolveConfig, rulesDownloadUrl, rulesFileName } from './resolve-config'
import type { ActionInputs } from './inputs'

const base: ActionInputs = {
  phpCsFixerVersion: 'v3.95.21',
  configPath: '',
  rulesVersion: 'v1.0.1',
  useFullRules: 'true',
  mode: 'check',
  paths: '',
}

describe('rules selection', () => {
  it('uses the full or minimal ruleset filename', () => {
    expect(rulesFileName('true')).toBe('.php-cs-fixer.dist.php')
    expect(rulesFileName('false')).toBe('.php-cs-fixer.dist.min.php')
  })

  it('builds the raw GitHub URL from rules-version', () => {
    expect(rulesDownloadUrl('v1.0.1', 'false')).toBe(
      'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/v1.0.1/.php-cs-fixer.dist.min.php',
    )
  })
})

describe('resolveConfig', () => {
  it('returns a local config-path when the file exists', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await writeFile(join(workspace, 'local.php'), '<?php\n')

    await expect(
      resolveConfig({ ...base, configPath: 'local.php' }, workspace),
    ).resolves.toBe('local.php')
  })

  it('does not download php-cs-fixer-rules for the local fixture config', async () => {
    const fetchImpl = vi.fn()
    await expect(
      resolveConfig(
        { ...base, configPath: 'tests/fixtures/.php-cs-fixer.dist.php' },
        process.cwd(),
        { fetchImpl },
      ),
    ).resolves.toBe('tests/fixtures/.php-cs-fixer.dist.php')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails when config-path is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(resolveConfig({ ...base, configPath: 'missing.php' }, workspace)).rejects.toThrow(
      /was not found/,
    )
  })

  it('downloads shared rules when config-path is empty', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('<?php return [];').buffer,
    })
    const writeFileImpl = vi.fn().mockResolvedValue(undefined)

    await expect(
      resolveConfig({ ...base, useFullRules: 'false' }, workspace, { fetchImpl, writeFileImpl }),
    ).resolves.toBe(DOWNLOADED_CONFIG)

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/v1.0.1/.php-cs-fixer.dist.min.php',
      expect.anything(),
    )
  })
})
