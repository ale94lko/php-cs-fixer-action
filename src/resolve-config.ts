// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { access, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import { assertChecksum, sha256File } from './cache'
import { ActionError, ActionErrorCode, ActionStep, toActionError } from './error-tracking'
import type { ActionInputs } from './inputs'
import { downloadToFile, type DownloadOptions } from './http'
import {
  expectedRulesChecksum,
  loadChecksums,
  resolveRulesChecksumsPath,
  rulesChecksumKey,
} from './rules-checksums'
import { ensureActionRuntimeDir } from './runtime-dir'

export const DOWNLOADED_CONFIG = '.php-cs-fixer.dist.php'

export type ResolveConfigOptions = DownloadOptions & {
  /** Directory for downloaded shared rules (defaults to RUNNER_TEMP/php-cs-fixer-action). */
  runtimeDir?: string
  rulesChecksumsPath?: string
  rulesChecksums?: Map<string, string>
}

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
  options: ResolveConfigOptions = {},
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

  const destDir = options.runtimeDir ?? (await ensureActionRuntimeDir())
  const dest = join(destDir, DOWNLOADED_CONFIG)
  const key = rulesChecksumKey(inputs.rulesVersion, inputs.useFullRules)

  try {
    const table =
      options.rulesChecksums ??
      (await loadChecksums(options.rulesChecksumsPath ?? resolveRulesChecksumsPath()))
    const expected = expectedRulesChecksum(key, table)

    await downloadToFile(rulesDownloadUrl(inputs.rulesVersion, inputs.useFullRules), dest, options)
    const actual = await sha256File(dest)
    try {
      assertChecksum(actual, expected, `php-cs-fixer-rules ${key}`)
    } catch (error) {
      await rm(dest, { force: true })
      throw error
    }
  } catch (error) {
    if (error instanceof ActionError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    const code = message.includes('Checksum mismatch')
      ? ActionErrorCode.ChecksumMismatch
      : message.includes('No SHA-256 checksum')
        ? ActionErrorCode.ChecksumMismatch
        : ActionErrorCode.DownloadFailed
    throw toActionError(ActionStep.ResolveConfig, code, error)
  }
  return dest
}
