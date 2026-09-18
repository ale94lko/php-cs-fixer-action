// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PHP_CS_FIXER_VERSION,
  DEFAULT_RULES_VERSION,
  type ActionInputs,
} from './inputs'
import {
  INPUTS_SCHEMA_FILE,
  SCHEMA_DEFAULTS,
  assertInputsSchema,
  compileInputsSchema,
  loadInputsSchema,
  toSchemaInputs,
} from './inputs.schema'

const valid: ActionInputs = {
  phpCsFixerVersion: DEFAULT_PHP_CS_FIXER_VERSION,
  configPath: '',
  rulesVersion: DEFAULT_RULES_VERSION,
  useFullRules: 'true',
  mode: 'check',
  paths: '',
  sarifFile: '',
}

describe('action.inputs.schema.json', () => {
  it('is a compileable JSON Schema with the Action input names', () => {
    const schema = loadInputsSchema(process.cwd()) as {
      properties?: Record<string, unknown>
      required?: string[]
    }
    expect(INPUTS_SCHEMA_FILE).toContain('schema')
    expect(schema.required).toEqual([
      'php-cs-fixer-version',
      'config-path',
      'rules-version',
      'use-full-rules',
      'mode',
      'paths',
      'sarif-file',
    ])
    expect(Object.keys(schema.properties ?? {})).toEqual(schema.required)
    expect(() => compileInputsSchema(schema)).not.toThrow()
  })

  it('accepts action.yml defaults', () => {
    const actionYaml = readFileSync(join(process.cwd(), 'action.yml'), 'utf8')
    const defaults = {
      'php-cs-fixer-version': actionYaml.match(
        /php-cs-fixer-version:[\s\S]*?default:\s*'?([^'\n]+)'?/,
      )?.[1],
      'config-path': '',
      'rules-version': actionYaml.match(/rules-version:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      'use-full-rules': actionYaml.match(/use-full-rules:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      mode: actionYaml.match(/^\s*mode:[\s\S]*?default:\s*'?([^'\n]+)'?/m)?.[1],
      paths: '',
      'sarif-file': '',
    }
    expect(defaults).toEqual(toSchemaInputs(SCHEMA_DEFAULTS))
    expect(() => assertInputsSchema(valid)).not.toThrow()
  })

  it('rejects invalid inputs through Ajv', () => {
    expect(() => assertInputsSchema({ ...valid, phpCsFixerVersion: 'latest' })).toThrow(
      /php-cs-fixer-version/,
    )
    expect(() => assertInputsSchema({ ...valid, mode: 'lint' })).toThrow(/Expected check or fix/)
    expect(() => assertInputsSchema({ ...valid, useFullRules: 'yes' })).toThrow(/true or false/)
    expect(() => assertInputsSchema({ ...valid, rulesVersion: '' })).toThrow(/must not be empty/)
    expect(() => assertInputsSchema({ ...valid, configPath: '../secrets.php' })).toThrow(
      /config-path/,
    )
    expect(() => assertInputsSchema({ ...valid, paths: '--allow-risky=yes' })).toThrow(/Invalid path/)
    expect(() => assertInputsSchema({ ...valid, sarifFile: '../out.sarif' })).toThrow(/sarif-file/)
  })
})
