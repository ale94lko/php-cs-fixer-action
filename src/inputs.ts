import * as core from '@actions/core'

export type ActionInputs = {
  phpCsFixerVersion: string
  configPath: string
  rulesVersion: string
  useFullRules: string
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
    phpCsFixerVersion: read('php-cs-fixer-version', 'PHP_CS_FIXER_VERSION', 'v3.95.21'),
    configPath: read('config-path', 'CONFIG_PATH', configFromEnv),
    rulesVersion: read('rules-version', 'RULES_VERSION', 'main'),
    useFullRules: read('use-full-rules', 'USE_FULL_RULES', 'true'),
  }
}
