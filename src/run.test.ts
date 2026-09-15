import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PHP_CS_FIXER_VERSION, type ActionInputs } from './inputs'
import { executeAction, run } from './run'

const inputs: ActionInputs = {
  phpCsFixerVersion: DEFAULT_PHP_CS_FIXER_VERSION,
  configPath: 'tests/fixtures/.php-cs-fixer.dist.php',
  rulesVersion: 'main',
  useFullRules: 'true',
  mode: 'check',
  paths: '',
}

const violationReport = JSON.stringify({
  files: [
    {
      name: 'tests/fixtures/Dirty.php',
      appliedFixers: ['visibility_required'],
      diff: '@@ -1,3 +1,6 @@\n <?php\n',
    },
  ],
})

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  summary: {
    addRaw: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  },
}))

const originalSummary = process.env.GITHUB_STEP_SUMMARY

afterEach(() => {
  vi.clearAllMocks()
  process.exitCode = undefined
  if (originalSummary === undefined) {
    delete process.env.GITHUB_STEP_SUMMARY
  } else {
    process.env.GITHUB_STEP_SUMMARY = originalSummary
  }
})

describe('executeAction', () => {
  it('emits file annotations and fails without a generic error', async () => {
    const core = await import('@actions/core')
    process.env.GITHUB_STEP_SUMMARY = '/tmp/step-summary.md'
    const downloadFixer = vi.fn().mockResolvedValue('php-cs-fixer')
    const resolveConfig = vi.fn().mockResolvedValue('tests/fixtures/.php-cs-fixer.dist.php')
    const runFixer = vi.fn().mockResolvedValue({ exitCode: 8, output: violationReport })

    await executeAction({
      readInputs: () => inputs,
      downloadFixer,
      resolveConfig,
      runFixer,
    })

    expect(downloadFixer).toHaveBeenCalledWith(DEFAULT_PHP_CS_FIXER_VERSION)
    expect(resolveConfig).toHaveBeenCalledWith(inputs)
    expect(runFixer).toHaveBeenCalledWith(
      'tests/fixtures/.php-cs-fixer.dist.php',
      expect.objectContaining({ mode: 'check', paths: [] }),
    )
    expect(core.setOutput).toHaveBeenCalledWith('code-style-result', violationReport)
    expect(core.error).toHaveBeenCalledWith(
      'Found violation(s) of type: visibility_required',
      expect.objectContaining({
        file: 'tests/fixtures/Dirty.php',
        startLine: 1,
        title: 'PHP CS Fixer',
      }),
    )
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('`tests/fixtures/Dirty.php`'),
      true,
    )
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('does not fail the Action when php-cs-fixer is clean', async () => {
    const core = await import('@actions/core')
    await executeAction({
      readInputs: () => inputs,
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('config.php'),
      runFixer: vi.fn().mockResolvedValue({
        exitCode: 0,
        output: JSON.stringify({ files: [] }),
      }),
    })
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.error).not.toHaveBeenCalled()
    expect(process.exitCode).not.toBe(1)
  })

  it('warns for rewritten files in fix mode', async () => {
    const core = await import('@actions/core')
    await executeAction({
      readInputs: () => ({ ...inputs, mode: 'fix' }),
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('config.php'),
      runFixer: vi.fn().mockResolvedValue({ exitCode: 0, output: violationReport }),
    })
    expect(core.warning).toHaveBeenCalledWith(
      'Found violation(s) of type: visibility_required',
      expect.objectContaining({ file: 'tests/fixtures/Dirty.php' }),
    )
    expect(core.error).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(process.exitCode).not.toBe(1)
  })

  it('forwards fix mode and parsed paths to the fixer', async () => {
    const runFixer = vi.fn().mockResolvedValue({ exitCode: 0, output: JSON.stringify({ files: [] }) })
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

  it('uses setFailed when the fixer fails without a parseable report', async () => {
    const core = await import('@actions/core')
    await executeAction({
      readInputs: () => inputs,
      downloadFixer: vi.fn().mockResolvedValue('php-cs-fixer'),
      resolveConfig: vi.fn().mockResolvedValue('config.php'),
      runFixer: vi.fn().mockResolvedValue({ exitCode: 1, output: 'Could not load config' }),
    })
    expect(core.setFailed).toHaveBeenCalledWith('Could not load config')
    expect(core.error).not.toHaveBeenCalled()
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
      runFixer: vi.fn().mockResolvedValue({ exitCode: 0, output: JSON.stringify({ files: [] }) }),
    })
    expect(core.info).toHaveBeenCalledWith('Downloading rules from php-cs-fixer-rules@main')
  })
})
