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

export function rulesDownloadUrl(rulesVersion: string, useFullRules: string): string {
  return `https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/${rulesVersion}/${rulesFileName(useFullRules)}`
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
