// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'
import { join } from 'node:path'

/** Default php-cs-fixer release tag when consumers omit `php-cs-fixer-version` (keep in sync with action.yml). */
export const DEFAULT_PHP_CS_FIXER_VERSION = 'v3.95.21'

/** Default php-cs-fixer-rules ref when consumers omit `rules-version` (keep in sync with action.yml). */
export const DEFAULT_RULES_VERSION = 'v1.0.1'

/** Default --allow-risky value (keep in sync with action.yml; yes for backward compatibility). */
export const DEFAULT_ALLOW_RISKY = 'yes'

/** Default PHP executable when `php-bin` is empty. */
export const DEFAULT_PHP_BIN = 'php'

export type ActionMode = 'check' | 'fix'

export type AllowRisky = 'yes' | 'no'

export type UsingCache = '' | 'yes' | 'no'

export type ActionInputs = {
  phpCsFixerVersion: string
  configPath: string
  rulesVersion: string
  useFullRules: string
  mode: string
  paths: string
  allowRisky: string
  phpBin: string
  workingDirectory: string
  usingCache: string
  cacheFile: string
  onlyChanged: string
  baseRef: string
}

function read(name: string, fallbackEnv: string, defaultValue: string): string {
  const fromAction = core.getInput(name)
  if (fromAction !== '') {
    return fromAction
  }
  return process.env[fallbackEnv] ?? defaultValue
}

export function readInputs(): ActionInputs {
  const configFromEnv = process.env.CONFIG_PATH ?? process.env.CONFIG_FILE ?? ''
  return {
    phpCsFixerVersion: read('php-cs-fixer-version', 'PHP_CS_FIXER_VERSION', DEFAULT_PHP_CS_FIXER_VERSION),
    configPath: read('config-path', 'CONFIG_PATH', configFromEnv),
    rulesVersion: read('rules-version', 'RULES_VERSION', DEFAULT_RULES_VERSION),
    useFullRules: read('use-full-rules', 'USE_FULL_RULES', 'true'),
    mode: read('mode', 'PHP_CS_FIXER_MODE', 'check'),
    paths: read('paths', 'PHP_CS_FIXER_PATHS', ''),
    allowRisky: read('allow-risky', 'PHP_CS_FIXER_ALLOW_RISKY', DEFAULT_ALLOW_RISKY),
    phpBin: read('php-bin', 'PHP_CS_FIXER_PHP_BIN', ''),
    workingDirectory: read('working-directory', 'PHP_CS_FIXER_WORKING_DIRECTORY', ''),
    usingCache: read('using-cache', 'PHP_CS_FIXER_USING_CACHE', ''),
    cacheFile: read('cache-file', 'PHP_CS_FIXER_CACHE_FILE', ''),
    onlyChanged: read('only-changed', 'PHP_CS_FIXER_ONLY_CHANGED', 'false'),
    baseRef: read('base-ref', 'PHP_CS_FIXER_BASE_REF', ''),
  }
}

/** Resolve spawn cwd from the repository workspace and optional working-directory input. */
export function resolveWorkingDirectory(workspace: string, workingDirectory: string): string {
  const trimmed = workingDirectory.trim()
  if (trimmed === '') {
    return workspace
  }
  return join(workspace, trimmed)
}
