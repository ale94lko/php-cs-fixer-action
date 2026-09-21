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
      'allow-risky',
      'php-bin',
      'working-directory',
      'using-cache',
      'cache-file',
      'only-changed',
      'base-ref',
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
      'allow-risky': actionYaml.match(/allow-risky:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      'php-bin': '',
      'working-directory': '',
      'using-cache': '',
      'cache-file': '',
      'only-changed': actionYaml.match(/only-changed:[\s\S]*?default:\s*'?([^'\n]+)'?/)?.[1],
      'base-ref': '',
      'sarif-file': '',
    }
    expect(defaults).toEqual(toSchemaInputs(SCHEMA_DEFAULTS))
    expect(() => assertInputsSchema(valid)).not.toThrow()
  })

  it('maps every ActionInputs field into the Ajv document', () => {
    expect(Object.keys(toSchemaInputs(valid)).sort()).toEqual([
      'allow-risky',
      'base-ref',
      'cache-file',
      'config-path',
      'mode',
      'only-changed',
      'paths',
      'php-bin',
      'php-cs-fixer-version',
      'rules-version',
      'sarif-file',
      'use-full-rules',
      'using-cache',
      'working-directory',
    ])
  })
})

describe('Ajv input validation boundary', () => {
  /** Fail closed through action.inputs.schema.json (Ajv) before Action use. */
  function expectAjvRejects(inputs: ActionInputs, message: RegExp): void {
    expect(() => assertInputsSchema(inputs)).toThrow(message)
  }

  it('rejects malformed php-cs-fixer-version via ajv', () => {
    expectAjvRejects({ ...valid, phpCsFixerVersion: 'latest' }, /php-cs-fixer-version/)
  })

  it('rejects malformed config-path via ajv', () => {
    expectAjvRejects({ ...valid, configPath: '../secrets.php' }, /config-path/)
  })

  it('rejects malformed rules-version via ajv', () => {
    expectAjvRejects({ ...valid, rulesVersion: '' }, /must not be empty/)
    expectAjvRejects(
      { ...valid, rulesVersion: '../../PHP-CS-Fixer/PHP-CS-Fixer/v3.64.0' },
      /rules-version/,
    )
  })

  it('rejects malformed use-full-rules via ajv', () => {
    expectAjvRejects({ ...valid, useFullRules: 'yes' }, /true or false/)
  })

  it('rejects malformed mode via ajv', () => {
    expectAjvRejects({ ...valid, mode: 'lint' }, /Expected check or fix/)
  })

  it('rejects malformed paths via ajv', () => {
    expectAjvRejects({ ...valid, paths: '../secrets.php' }, /Invalid path/)
    expectAjvRejects({ ...valid, paths: '["../secrets.php"]' }, /Invalid path/)
  })

  it('rejects malformed allow-risky via ajv', () => {
    expectAjvRejects({ ...valid, allowRisky: 'true' }, /yes or no/)
  })

  it('rejects malformed php-bin via ajv', () => {
    expectAjvRejects({ ...valid, phpBin: '../php' }, /php-bin/)
  })

  it('rejects malformed working-directory via ajv', () => {
    expectAjvRejects({ ...valid, workingDirectory: '../out' }, /working-directory/)
  })

  it('rejects malformed using-cache via ajv', () => {
    expectAjvRejects({ ...valid, usingCache: 'true' }, /using-cache/)
  })

  it('rejects malformed cache-file via ajv', () => {
    expectAjvRejects({ ...valid, cacheFile: '/tmp/cache' }, /cache-file/)
  })

  it('rejects malformed only-changed via ajv', () => {
    expectAjvRejects({ ...valid, onlyChanged: 'yes' }, /true or false/)
  })

  it('rejects malformed base-ref via ajv', () => {
    expectAjvRejects({ ...valid, baseRef: '../main' }, /base-ref/)
  })

  it('rejects malformed sarif-file via ajv', () => {
    expectAjvRejects({ ...valid, sarifFile: '../out.sarif' }, /sarif-file/)
  })

  it('accepts valid paths and refs through ajv', () => {
    expect(() => assertInputsSchema({ ...valid, paths: 'src tests' })).not.toThrow()
    expect(() =>
      assertInputsSchema({
        ...valid,
        paths: '["src/with space.php"]',
      }),
    ).not.toThrow()
    expect(() =>
      assertInputsSchema({ ...valid, onlyChanged: 'true', baseRef: 'origin/main' }),
    ).not.toThrow()
    expect(() => assertInputsSchema({ ...valid, rulesVersion: 'release/1.0' })).not.toThrow()
  })

  it('rejects rules-version path traversal and empty path segments via ajv', () => {
    expectAjvRejects({ ...valid, rulesVersion: 'release//v1' }, /rules-version/)
    expectAjvRejects({ ...valid, rulesVersion: 'main/' }, /rules-version/)
    expectAjvRejects({ ...valid, rulesVersion: '/main' }, /rules-version/)
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
