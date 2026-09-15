import * as core from '@actions/core'
import { downloadFixer } from './download-fixer'
import { readInputs, type ActionInputs } from './inputs'
import { failWithoutGenericAnnotation, publishReport, tryParseViolations } from './report'
import { resolveConfig } from './resolve-config'
import { runFixer, type FixerResult } from './run-fixer'
import { parsePaths, validateAllInputs } from './validate'

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
  const mode = inputs.mode === 'fix' ? 'fix' : 'check'

  core.info(`Resolving php-cs-fixer ${inputs.phpCsFixerVersion}`)
  await deps.downloadFixer(inputs.phpCsFixerVersion)

  core.info(
    inputs.configPath === ''
      ? `Downloading rules from php-cs-fixer-rules@${inputs.rulesVersion}`
      : `Using local config: ${inputs.configPath}`,
  )
  const configFile = await deps.resolveConfig(inputs)

  const result = await deps.runFixer(configFile, {
    mode,
    paths: parsePaths(inputs.paths),
  })
  core.setOutput('code-style-result', result.output)

  const violations = tryParseViolations(result.output)
  await publishReport(violations, mode)

  if (result.exitCode === 0) {
    return result
  }

  if (violations.length > 0) {
    failWithoutGenericAnnotation()
    return result
  }

  core.setFailed(result.output.trim() || 'php-cs-fixer failed.')
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
