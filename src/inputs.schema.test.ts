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
  schemaErrorMessage,
  toSchemaInputs,
} from './inputs.schema'
import type { ErrorObject } from 'ajv'

const valid: ActionInputs = {
  phpCsFixerVersion: DEFAULT_PHP_CS_FIXER_VERSION,
  configPath: '',
  rulesVersion: DEFAULT_RULES_VERSION,
  useFullRules: 'true',
  mode: 'check',
  paths: '',
  allowRisky: 'yes',
  phpBin: '',
  workingDirectory: '',
  usingCache: '',
  cacheFile: '',
  onlyChanged: 'false',
  baseRef: '',
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
      'allow-risky',
      'php-bin',
      'working-directory',
      'using-cache',
      'cache-file',
      'only-changed',
      'base-ref',
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
      'allow-risky': actionYaml.match(/allow-risky:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      'php-bin': '',
      'working-directory': '',
      'using-cache': '',
      'cache-file': '',
      'only-changed': actionYaml.match(/only-changed:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      'base-ref': '',
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
    expect(() => assertInputsSchema({ ...valid, allowRisky: 'true' })).toThrow(/yes or no/)
    expect(() => assertInputsSchema({ ...valid, phpBin: '../php' })).toThrow(/php-bin/)
    expect(() => assertInputsSchema({ ...valid, workingDirectory: '../out' })).toThrow(
      /working-directory/,
    )
    expect(() => assertInputsSchema({ ...valid, usingCache: 'true' })).toThrow(/using-cache/)
    expect(() => assertInputsSchema({ ...valid, cacheFile: '/tmp/cache' })).toThrow(/cache-file/)
    expect(() => assertInputsSchema({ ...valid, onlyChanged: 'yes' })).toThrow(/true or false/)
    expect(() => assertInputsSchema({ ...valid, baseRef: '../main' })).toThrow(/base-ref/)
    expect(() => assertInputsSchema({ ...valid, rulesVersion: '' })).toThrow(/must not be empty/)
    expect(() =>
      assertInputsSchema({ ...valid, onlyChanged: 'true', baseRef: 'origin/main' }),
    ).not.toThrow()
    expect(() => assertInputsSchema({ ...valid, rulesVersion: 'release/1.0' })).not.toThrow()
    expect(() => assertInputsSchema({ ...valid, configPath: '../secrets.php' })).toThrow(
      /config-path/,
    )
    expect(() => assertInputsSchema({ ...valid, paths: '--allow-risky=yes' })).toThrow(/Invalid path/)
  })

  it('rejects rules-version path traversal and empty path segments', () => {
    expect(() =>
      assertInputsSchema({
        ...valid,
        rulesVersion: '../../PHP-CS-Fixer/PHP-CS-Fixer/v3.64.0',
      }),
    ).toThrow(/rules-version/)
    expect(() => assertInputsSchema({ ...valid, rulesVersion: 'release//v1' })).toThrow(
      /rules-version/,
    )
    expect(() => assertInputsSchema({ ...valid, rulesVersion: 'main/' })).toThrow(/rules-version/)
    expect(() => assertInputsSchema({ ...valid, rulesVersion: '/main' })).toThrow(/rules-version/)
  })
})

describe('schemaErrorMessage', () => {
  it('uses the default message branch for unknown fields', () => {
    const document = toSchemaInputs(valid)
    expect(
      schemaErrorMessage(document, {
        instancePath: '/unknown-field',
        message: 'must be string',
        params: {},
      } as ErrorObject),
    ).toBe('Invalid Action inputs: must be string')
    expect(
      schemaErrorMessage(document, {
        instancePath: '',
        message: undefined,
        params: {},
      } as ErrorObject),
    ).toBe('Invalid Action inputs.')
  })

  it('returns an empty field value when the instance path is missing', () => {
    expect(
      schemaErrorMessage(toSchemaInputs(valid), {
        instancePath: '/not-a-real-key',
        message: 'bad',
        params: {},
      } as ErrorObject),
    ).toMatch(/Invalid Action inputs/)
  })
})
