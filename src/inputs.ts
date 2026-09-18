// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'

/** Default php-cs-fixer release tag when consumers omit `php-cs-fixer-version` (keep in sync with action.yml). */
export const DEFAULT_PHP_CS_FIXER_VERSION = 'v3.95.21'

/** Default php-cs-fixer-rules ref when consumers omit `rules-version` (keep in sync with action.yml). */
export const DEFAULT_RULES_VERSION = 'v1.0.1'

export type ActionMode = 'check' | 'fix'

export type ActionInputs = {
  phpCsFixerVersion: string
  configPath: string
  rulesVersion: string
  useFullRules: string
  mode: string
  paths: string
  sarifFile: string
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
    sarifFile: read('sarif-file', 'PHP_CS_FIXER_SARIF_FILE', ''),
  }
}
