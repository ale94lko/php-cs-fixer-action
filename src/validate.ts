// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { isAbsolute, relative, resolve, sep } from 'node:path'
import { ActionError, ActionErrorCode, ActionStep } from './error-tracking'
import type { ActionInputs, ActionMode } from './inputs'
import { SCHEMA_DEFAULTS, assertInputsSchema } from './inputs.schema'

function invalidInput(message: string): never {
  throw new ActionError(ActionStep.ValidateInputs, ActionErrorCode.InvalidInput, message)
}

const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/

export function validatePhpCsFixerVersion(version: string): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, phpCsFixerVersion: version })
}

export function validateUseFullRules(value: string): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, useFullRules: value })
}

export function validateGitRef(ref: string): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, rulesVersion: ref })
}

export function validateConfigPath(path: string): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, configPath: path })
}

export function validateSarifFile(path: string, workspace = process.cwd()): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, sarifFile: path })
  if (path === '') {
    return
  }
  if (
    path.startsWith('-') ||
    path.startsWith('/') ||
    WINDOWS_ABSOLUTE.test(path) ||
    hasParentSegment(path) ||
    !isInsideWorkspace(workspace, path)
  ) {
    invalidInput(`Invalid sarif-file '${path}'. Use a relative path inside the workspace.`)
  }
}

export function validateMode(mode: string): asserts mode is ActionMode {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, mode })
}

export function parsePaths(raw: string): string[] {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return []
  }
  return trimmed.split(/\s+/)
}

function hasParentSegment(path: string): boolean {
  return path.split(/[\\/]/).includes('..')
}

function isInsideWorkspace(workspace: string, candidate: string): boolean {
  const root = resolve(workspace)
  const resolved = resolve(workspace, candidate)
  const rel = relative(root, resolved)
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

export function validatePaths(raw: string, workspace = process.cwd()): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, paths: raw })
  for (const path of parsePaths(raw)) {
    if (
      path.startsWith('-') ||
      path.startsWith('/') ||
      WINDOWS_ABSOLUTE.test(path) ||
      hasParentSegment(path) ||
      !isInsideWorkspace(workspace, path)
    ) {
      invalidInput(`Invalid path '${path}'. Use a relative path inside the workspace.`)
    }
  }
}

export function validateAllInputs(inputs: ActionInputs, workspace = process.cwd()): void {
  assertInputsSchema(inputs)
  validatePaths(inputs.paths, workspace)
  validateSarifFile(inputs.sarifFile, workspace)
}
