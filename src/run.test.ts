import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActionInputs } from './inputs'
import { VIOLATIONS_MESSAGE, executeAction, run } from './run'

const inputs: ActionInputs = {
  phpCsFixerVersion: 'v3.95.21',
  configPath: 'tests/fixtures/.php-cs-fixer.dist.php',
  rulesVersion: 'main',
  useFullRules: 'true',
  mode: 'check',
  paths: '',
}

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('executeAction', () => {
  it('downloads the fixer, resolves config and fails on violations', async () => {
    const core = await import('@actions/core')
    const downloadFixer = vi.fn().mockResolvedValue('php-cs-fixer')
    const resolveConfig = vi.fn().mockResolvedValue('tests/fixtures/.php-cs-fixer.dist.php')
    const runFixer = vi.fn().mockResolvedValue({ exitCode: 8, output: 'diff' })

    await executeAction({
      readInputs: () => inputs,
      downloadFixer,
      resolveConfig,
      runFixer,
    })

    expect(downloadFixer).toHaveBeenCalledWith('v3.95.21')
    expect(resolveConfig).toHaveBeenCalledWith(inputs)
    expect(runFixer).toHaveBeenCalledWith(
      'tests/fixtures/.php-cs-fixer.dist.php',
      expect.objectContaining({ mode: 'check', paths: [] }),
    )
    expect(core.setOutput).toHaveBeenCalledWith('code-style-result', 'diff')
    expect(core.setFailed).toHaveBeenCalledWith(VIOLATIONS_MESSAGE)
  })

  it('does not fail the Action when php-cs-fixer is clean', async () => {
    const core = await import('@actions/core')
    await executeAction({
      readInputs: () => inputs,
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('config.php'),
      runFixer: vi.fn().mockResolvedValue({ exitCode: 0, output: 'ok' }),
    })
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('forwards fix mode and parsed paths to the fixer', async () => {
    const runFixer = vi.fn().mockResolvedValue({ exitCode: 0, output: 'fixed' })
    await executeAction({
      readInputs: () => ({ ...inputs, mode: 'fix', paths: 'src tests' }),
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('config.php'),
      runFixer,
    })
    expect(runFixer).toHaveBeenCalledWith(
      'config.php',
      expect.objectContaining({ mode: 'fix', paths: ['src', 'tests'] }),
    )
  })

  it('does not download when inputs are invalid', async () => {
    const downloadFixer = vi.fn()
    await expect(
      executeAction({
        readInputs: () => ({ ...inputs, phpCsFixerVersion: 'latest' }),
        downloadFixer,
        resolveConfig: vi.fn(),
        runFixer: vi.fn(),
      }),
    ).rejects.toThrow(/php-cs-fixer-version/)
    expect(downloadFixer).not.toHaveBeenCalled()
  })

  it('does not download when mode is unknown', async () => {
    const downloadFixer = vi.fn()
    await expect(
      executeAction({
        readInputs: () => ({ ...inputs, mode: 'lint' }),
        downloadFixer,
        resolveConfig: vi.fn(),
        runFixer: vi.fn(),
      }),
    ).rejects.toThrow(/Expected check or fix/)
    expect(downloadFixer).not.toHaveBeenCalled()
  })
})

describe('run', () => {
  it('maps thrown errors to core.setFailed', async () => {
    const core = await import('@actions/core')
    await run({
      readInputs: () => {
        throw new Error('boom')
      },
      downloadFixer: vi.fn(),
      resolveConfig: vi.fn(),
      runFixer: vi.fn(),
    })
    expect(core.setFailed).toHaveBeenCalledWith('boom')
  })

  it('stringifies non-Error failures', async () => {
    const core = await import('@actions/core')
    await run({
      readInputs: () => {
        throw 'nope'
      },
      downloadFixer: vi.fn(),
      resolveConfig: vi.fn(),
      runFixer: vi.fn(),
    })
    expect(core.setFailed).toHaveBeenCalledWith('nope')
  })

  it('logs the shared-rules path when config-path is empty', async () => {
    const core = await import('@actions/core')
    await executeAction({
      readInputs: () => ({ ...inputs, configPath: '' }),
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('.php-cs-fixer.dist.php'),
      runFixer: vi.fn().mockResolvedValue({ exitCode: 0, output: 'ok' }),
    })
    expect(core.info).toHaveBeenCalledWith('Downloading rules from php-cs-fixer-rules@main')
  })
})
