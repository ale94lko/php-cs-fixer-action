// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ActionError, ActionErrorCode, ActionStep } from './error-tracking'
import {
  DEFAULT_PHP_CS_FIXER_VERSION,
  DEFAULT_RULES_VERSION,
  type ActionInputs,
} from './inputs'

export const INPUTS_SCHEMA_FILE = 'action.inputs.schema.json'

export type SchemaInputs = {
  'php-cs-fixer-version': string
  'config-path': string
  'rules-version': string
  'use-full-rules': string
  mode: string
  paths: string
}

export function inputsSchemaPath(root = join(__dirname, '..')): string {
  return join(root, INPUTS_SCHEMA_FILE)
}

export function loadInputsSchema(root?: string): object {
  return JSON.parse(readFileSync(inputsSchemaPath(root), 'utf8')) as object
}

export function toSchemaInputs(inputs: ActionInputs): SchemaInputs {
  return {
    'php-cs-fixer-version': inputs.phpCsFixerVersion,
    'config-path': inputs.configPath,
    'rules-version': inputs.rulesVersion,
    'use-full-rules': inputs.useFullRules,
    mode: inputs.mode,
    paths: inputs.paths,
  }
}

export const SCHEMA_DEFAULTS: ActionInputs = {
  phpCsFixerVersion: DEFAULT_PHP_CS_FIXER_VERSION,
  configPath: '',
  rulesVersion: DEFAULT_RULES_VERSION,
  useFullRules: 'true',
  mode: 'check',
  paths: '',
}

let compiled: ValidateFunction<SchemaInputs> | undefined

export function compileInputsSchema(schema: object = loadInputsSchema()): ValidateFunction<SchemaInputs> {
  const ajv = new Ajv({ allErrors: true, strict: true, unicodeRegExp: false })
  return ajv.compile<SchemaInputs>(schema)
}

function validator(): ValidateFunction<SchemaInputs> {
  compiled ??= compileInputsSchema()
  return compiled
}

function fieldValue(document: SchemaInputs, error: ErrorObject): string {
  const key = error.instancePath.replace(/^\//, '') as keyof SchemaInputs | ''
  if (key !== '' && key in document) {
    return document[key]
  }
  return ''
}

export function schemaErrorMessage(document: SchemaInputs, error: ErrorObject): string {
  const key = error.instancePath.replace(/^\//, '') || String(error.params?.missingProperty ?? '')
  const value = fieldValue(document, error)
  switch (key) {
    case 'php-cs-fixer-version':
      return `Invalid php-cs-fixer-version '${value}'. Expected a release tag like v3.95.21.`
    case 'use-full-rules':
      return `Invalid use-full-rules '${value}'. Expected true or false.`
    case 'rules-version':
      return value === ''
        ? 'rules-version must not be empty.'
        : `Invalid rules-version '${value}'. Use a tag, branch, or SHA.`
    case 'config-path':
      return `Invalid config-path '${value}'. Use a relative path inside the workspace.`
    case 'mode':
      return `Invalid mode '${value}'. Expected check or fix.`
    case 'paths': {
      const token = value.trim().split(/\s+/).find((part) => part !== '') ?? value
      return `Invalid path '${token}'. Use a relative path inside the workspace.`
    }
    default:
      return error.message ? `Invalid Action inputs: ${error.message}` : 'Invalid Action inputs.'
  }
}

function invalidInput(message: string): never {
  throw new ActionError(ActionStep.ValidateInputs, ActionErrorCode.InvalidInput, message)
}

/** Fail closed when inputs do not satisfy action.inputs.schema.json. */
export function assertInputsSchema(inputs: ActionInputs): void {
  const document = toSchemaInputs(inputs)
  const validate = validator()
  if (validate(document)) {
    return
  }
  const error = validate.errors?.[0]
  invalidInput(error ? schemaErrorMessage(document, error) : 'Invalid Action inputs.')
}
