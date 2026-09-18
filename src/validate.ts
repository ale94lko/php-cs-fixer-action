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

export function validateMode(mode: string): asserts mode is ActionMode {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, mode })
}

/**
 * Parse the `paths` input.
 * - Empty → no path args (config finder)
 * - JSON array string → string elements (supports spaces in path names)
 * - Newline-separated → one path per line (supports spaces)
 * - Otherwise → whitespace-separated (backward compatible; no spaces in names)
 */
export function parsePaths(raw: string): string[] {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return []
  }
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      invalidInput(
        'Invalid paths JSON. Expected a JSON array of relative workspace path strings.',
      )
    }
    if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
      invalidInput(
        'Invalid paths JSON. Expected a JSON array of relative workspace path strings.',
      )
    }
    return (parsed as string[]).map((entry) => entry.trim()).filter((entry) => entry !== '')
  }
  if (/[\r\n]/.test(trimmed)) {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
  }
  return trimmed.split(/\s+/).filter((part) => part !== '')
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

/** Fail closed when any path is absolute, traverses parents, or looks like a CLI flag. */
export function assertSafeWorkspacePaths(paths: string[], workspace = process.cwd()): void {
  for (const path of paths) {
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

export function validatePaths(raw: string, workspace = process.cwd()): void {
  assertInputsSchema({ ...SCHEMA_DEFAULTS, paths: raw })
  assertSafeWorkspacePaths(parsePaths(raw), workspace)
}

export function validateAllInputs(inputs: ActionInputs, workspace = process.cwd()): void {
  assertInputsSchema(inputs)
  validatePaths(inputs.paths, workspace)
  if (inputs.workingDirectory.trim() !== '') {
    assertSafeWorkspacePaths([inputs.workingDirectory], workspace)
  }
  if (inputs.cacheFile.trim() !== '') {
    assertSafeWorkspacePaths([inputs.cacheFile], workspace)
  }
}
