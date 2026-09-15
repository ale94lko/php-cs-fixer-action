import * as core from '@actions/core'
import { downloadFixer } from './download-fixer'
import { readInputs, type ActionInputs } from './inputs'
import { resolveConfig } from './resolve-config'
import { runFixer, type FixerResult } from './run-fixer'
import { parsePaths, validateAllInputs } from './validate'

export const VIOLATIONS_MESSAGE =
  'PHP CS Fixer found coding standard violations. See the detailed report above for files, fixers and diffs.'

export type ActionDeps = {
  readInputs: () => ActionInputs
  downloadFixer: typeof downloadFixer
  resolveConfig: typeof resolveConfig
  runFixer: typeof runFixer
}

const defaultDeps: ActionDeps = {
  readInputs,
  downloadFixer,
  resolveConfig,
  runFixer,
}

export async function executeAction(deps: ActionDeps = defaultDeps): Promise<FixerResult | void> {
  const inputs = deps.readInputs()
  validateAllInputs(inputs)

  core.info(`Downloading php-cs-fixer ${inputs.phpCsFixerVersion}`)
  await deps.downloadFixer(inputs.phpCsFixerVersion)

  core.info(
    inputs.configPath === ''
      ? `Downloading rules from php-cs-fixer-rules@${inputs.rulesVersion}`
      : `Using local config: ${inputs.configPath}`,
  )
  const configFile = await deps.resolveConfig(inputs)

  const result = await deps.runFixer(configFile, {
    mode: inputs.mode === 'fix' ? 'fix' : 'check',
    paths: parsePaths(inputs.paths),
  })
  core.setOutput('code-style-result', result.output)

  if (result.exitCode !== 0) {
    core.setFailed(VIOLATIONS_MESSAGE)
  }

  return result
}

export async function run(deps: ActionDeps = defaultDeps): Promise<void> {
  try {
    await executeAction(deps)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    core.setFailed(message)
  }
}
