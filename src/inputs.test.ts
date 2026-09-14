import { afterEach, describe, expect, it, vi } from 'vitest'
import { readInputs } from './inputs'

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
  })

  it('uses documented defaults', () => {
    expect(readInputs()).toEqual({
      phpCsFixerVersion: 'v3.95.21',
      configPath: '',
      rulesVersion: 'main',
      useFullRules: 'true',
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
})
