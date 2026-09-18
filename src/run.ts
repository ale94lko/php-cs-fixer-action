// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'
import { listChangedPhpPaths, type GitExec } from './changed-paths'
import { downloadFixer } from './download-fixer'
import {
  ActionErrorCode,
  ActionStep,
  reportFailure,
  toActionError,
  type FailureReport,
} from './error-tracking'
import { readInputs, type ActionInputs } from './inputs'
import { failWithoutGenericAnnotation, publishReport, tryParseViolations } from './report'
import { resolveConfig } from './resolve-config'
import { runFixer, type FixerResult } from './run-fixer'
import { assertSafeWorkspacePaths, parsePaths, validateAllInputs } from './validate'

const EMPTY_REPORT = '{"files":[]}'

export type ActionDeps = {
  readInputs: () => ActionInputs
  downloadFixer: typeof downloadFixer
  resolveConfig: typeof resolveConfig
  runFixer: typeof runFixer
  listChangedPhpPaths?: typeof listChangedPhpPaths
  gitExec?: GitExec
  reportFailure?: typeof reportFailure
}

const defaultDeps: ActionDeps = {
  readInputs,
  downloadFixer,
  resolveConfig,
  runFixer,
  listChangedPhpPaths,
  reportFailure,
}

async function resolveFixerPaths(
  inputs: ActionInputs,
  deps: ActionDeps,
  workspace = process.cwd(),
): Promise<string[] | 'skip'> {
  const pathFilters = parsePaths(inputs.paths)
  if (inputs.onlyChanged !== 'true') {
    return pathFilters
  }

  const listChanged = deps.listChangedPhpPaths ?? listChangedPhpPaths
  const changed = await listChanged({
    workspace,
    baseRef: inputs.baseRef,
    pathFilters,
    gitExec: deps.gitExec,
  })
  assertSafeWorkspacePaths(changed, workspace)
  if (changed.length === 0) {
    core.info('only-changed: no PHP files changed; skipping php-cs-fixer')
    return 'skip'
  }
  core.info(`only-changed: checking ${changed.length} PHP file(s)`)
  return changed
}

export async function executeAction(deps: ActionDeps = defaultDeps): Promise<FixerResult | void> {
  const report = deps.reportFailure ?? reportFailure
  const inputs = deps.readInputs()
  validateAllInputs(inputs)
  const mode = inputs.mode === 'fix' ? 'fix' : 'check'

  const fixerPaths = await resolveFixerPaths(inputs, deps)
  if (fixerPaths === 'skip') {
    core.setOutput('code-style-result', EMPTY_REPORT)
    return { exitCode: 0, output: EMPTY_REPORT }
  }

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
    paths: fixerPaths,
    allowRisky: inputs.allowRisky === 'no' ? 'no' : 'yes',
  })
  core.setOutput('code-style-result', result.output)

  const violations = tryParseViolations(result.output)
  await publishReport(violations, mode)

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
