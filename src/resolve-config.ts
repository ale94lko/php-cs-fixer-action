// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import { ActionError, ActionErrorCode, ActionStep, toActionError } from './error-tracking'
import type { ActionInputs } from './inputs'
import { downloadToFile, type DownloadOptions } from './http'

export const DOWNLOADED_CONFIG = '.php-cs-fixer.dist.php'

export function rulesFileName(useFullRules: string): string {
  return useFullRules === 'true' ? '.php-cs-fixer.dist.php' : '.php-cs-fixer.dist.min.php'
}

const RULES_RAW_ORIGIN = 'https://raw.githubusercontent.com'
const RULES_REPO_PREFIX = '/ale94lko/php-cs-fixer-rules/'

/** Build the download URL; reject refs that URL-normalize outside this rules repo. */
export function rulesDownloadUrl(rulesVersion: string, useFullRules: string): string {
  const file = rulesFileName(useFullRules)
  const expectedPath = `${RULES_REPO_PREFIX}${rulesVersion}/${file}`
  const url = new URL(`${RULES_RAW_ORIGIN}${expectedPath}`)
  if (url.origin !== RULES_RAW_ORIGIN || url.pathname !== expectedPath) {
    throw new ActionError(
      ActionStep.ResolveConfig,
      ActionErrorCode.InvalidInput,
      `Invalid rules-version '${rulesVersion}'. Use a tag, branch, or SHA.`,
    )
  }
  return url.toString()
}

export async function resolveConfig(
  inputs: ActionInputs,
  workspace = process.cwd(),
  options: DownloadOptions = {},
): Promise<string> {
  if (inputs.configPath !== '') {
    const localPath = join(workspace, inputs.configPath)
    try {
      await access(localPath, constants.F_OK)
    } catch {
      throw new ActionError(
        ActionStep.ResolveConfig,
        ActionErrorCode.ConfigNotFound,
        `config-path '${inputs.configPath}' was not found in the repository workspace.`,
      )
    }
    return inputs.configPath
  }

  const dest = join(workspace, DOWNLOADED_CONFIG)
  try {
    await downloadToFile(rulesDownloadUrl(inputs.rulesVersion, inputs.useFullRules), dest, options)
  } catch (error) {
    throw toActionError(ActionStep.ResolveConfig, ActionErrorCode.DownloadFailed, error)
  }
  return DOWNLOADED_CONFIG
}
