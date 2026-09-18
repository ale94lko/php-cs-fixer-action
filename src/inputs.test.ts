// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PHP_CS_FIXER_VERSION, DEFAULT_RULES_VERSION, readInputs, resolveWorkingDirectory } from './inputs'

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
}))

describe('readInputs', () => {
  afterEach(async () => {
    const core = await import('@actions/core')
    vi.mocked(core.getInput).mockImplementation(() => '')
    delete process.env.PHP_CS_FIXER_VERSION
    delete process.env.CONFIG_PATH
    delete process.env.CONFIG_FILE
    delete process.env.RULES_VERSION
    delete process.env.USE_FULL_RULES
    delete process.env.PHP_CS_FIXER_MODE
    delete process.env.PHP_CS_FIXER_PATHS
    delete process.env.PHP_CS_FIXER_ALLOW_RISKY
    delete process.env.PHP_CS_FIXER_PHP_BIN
    delete process.env.PHP_CS_FIXER_WORKING_DIRECTORY
    delete process.env.PHP_CS_FIXER_USING_CACHE
    delete process.env.PHP_CS_FIXER_CACHE_FILE
    delete process.env.PHP_CS_FIXER_ONLY_CHANGED
    delete process.env.PHP_CS_FIXER_BASE_REF
    delete process.env.PHP_CS_FIXER_SARIF_FILE
  })

  it('uses documented defaults', () => {
    expect(readInputs()).toEqual({
      phpCsFixerVersion: DEFAULT_PHP_CS_FIXER_VERSION,
      configPath: '',
      rulesVersion: DEFAULT_RULES_VERSION,
      useFullRules: 'true',
      mode: 'check',
      paths: '',
      allowRisky: 'yes',
      phpBin: '',
      workingDirectory: '',
      usingCache: '',
      cacheFile: '',
      onlyChanged: 'false',
      baseRef: '',
      sarifFile: '',
    })
  })

  it('prefers Action inputs over env fallbacks', async () => {
    const core = await import('@actions/core')
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'php-cs-fixer-version' ? 'v3.88.0' : '',
    )
    expect(readInputs().phpCsFixerVersion).toBe('v3.88.0')
  })

  it('prefers CONFIG_FILE when CONFIG_PATH is unset (local/docker)', () => {
    process.env.CONFIG_FILE = 'tests/fixtures/.php-cs-fixer.dist.php'
    expect(readInputs().configPath).toBe('tests/fixtures/.php-cs-fixer.dist.php')
  })

  it('reads mode, paths and sarif-file from env fallbacks', () => {
    process.env.PHP_CS_FIXER_MODE = 'fix'
    process.env.PHP_CS_FIXER_PATHS = 'src tests'
    process.env.PHP_CS_FIXER_SARIF_FILE = 'php-cs-fixer.sarif'
    expect(readInputs()).toMatchObject({
      mode: 'fix',
      paths: 'src tests',
      sarifFile: 'php-cs-fixer.sarif',
    })
  })

  it('resolves working-directory under the workspace', () => {
    expect(resolveWorkingDirectory('/repo', '')).toBe('/repo')
    expect(resolveWorkingDirectory('/repo', 'packages/api')).toMatch(/packages[/\\]api$/)
  })

  it('defaults php-cs-fixer-version and rules-version to release tags aligned with action.yml', () => {
    expect(DEFAULT_PHP_CS_FIXER_VERSION).toMatch(/^v[0-9]+\.[0-9]+\.[0-9]+$/)
    expect(DEFAULT_RULES_VERSION).toMatch(/^v[0-9]+\.[0-9]+\.[0-9]+$/)
    const actionYaml = readFileSync(join(process.cwd(), 'action.yml'), 'utf8')
    const fixerMatch = actionYaml.match(
      /^\s*php-cs-fixer-version:[\s\S]*?^\s*default:\s*['"]?([^'"\n]+)['"]?\s*$/m,
    )
    const rulesMatch = actionYaml.match(
      /^\s*rules-version:[\s\S]*?^\s*default:\s*['"]?([^'"\n]+)['"]?\s*$/m,
    )
    expect(fixerMatch?.[1]).toBe(DEFAULT_PHP_CS_FIXER_VERSION)
    expect(rulesMatch?.[1]).toBe(DEFAULT_RULES_VERSION)
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')
    expect(envExample).toMatch(
      new RegExp(`^PHP_CS_FIXER_VERSION=${DEFAULT_PHP_CS_FIXER_VERSION}$`, 'm'),
    )
  })
})
