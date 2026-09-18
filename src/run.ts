// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'
import { downloadFixer } from './download-fixer'
import {
  ActionErrorCode,
  ActionStep,
  reportFailure,
  toActionError,
  type FailureReport,
} from './error-tracking'
import { readInputs, type ActionInputs } from './inputs'
import { failWithoutGenericAnnotation, publishReport, tryParseViolations, writeSarifFile } from './report'
import { resolveConfig } from './resolve-config'
import { runFixer, type FixerResult } from './run-fixer'
import { parsePaths, validateAllInputs } from './validate'

export type ActionDeps = {
  readInputs: () => ActionInputs
  downloadFixer: typeof downloadFixer
  resolveConfig: typeof resolveConfig
  runFixer: typeof runFixer
  reportFailure?: typeof reportFailure
}

const defaultDeps: ActionDeps = {
  readInputs,
  downloadFixer,
  resolveConfig,
  runFixer,
  reportFailure,
}

export async function executeAction(deps: ActionDeps = defaultDeps): Promise<FixerResult | void> {
  const report = deps.reportFailure ?? reportFailure
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
  if (inputs.sarifFile !== '') {
    await writeSarifFile(inputs.sarifFile, violations, mode)
  }

  if (result.exitCode === 0) {
    return result
  }

  if (violations.length > 0) {
    await report({
      step: ActionStep.RunFixer,
      code: ActionErrorCode.StyleViolations,
      message: `php-cs-fixer reported ${violations.length} file(s) with style violations.`,
    }, { fail: false })
    failWithoutGenericAnnotation()
    return result
  }

  await report({
    step: ActionStep.RunFixer,
    code: ActionErrorCode.FixerFailed,
    message: result.output.trim() || 'php-cs-fixer failed.',
  })
  return result
}

export async function run(deps: ActionDeps = defaultDeps): Promise<void> {
  const report = deps.reportFailure ?? reportFailure
  try {
    await executeAction(deps)
  } catch (error) {
    const tracked = toActionError(ActionStep.Run, ActionErrorCode.Unexpected, error)
    const payload: FailureReport = {
      step: tracked.step,
      code: tracked.code,
      message: tracked.message,
    }
    await report(payload)
  }
}
