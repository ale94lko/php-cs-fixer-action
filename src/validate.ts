import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { ActionInputs, ActionMode } from './inputs'

const VERSION_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/
const GIT_REF_PATTERN = /^[A-Za-z0-9._/-]+$/
const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/

export function validatePhpCsFixerVersion(version: string): void {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid php-cs-fixer-version '${version}'. Expected a release tag like v3.95.21.`,
    )
  }
}

export function validateUseFullRules(value: string): void {
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid use-full-rules '${value}'. Expected true or false.`)
  }
}

export function validateGitRef(ref: string): void {
  if (ref === '') {
    throw new Error('rules-version must not be empty.')
  }
  if (!GIT_REF_PATTERN.test(ref)) {
    throw new Error(`Invalid rules-version '${ref}'. Use a tag, branch, or SHA.`)
  }
}

export function validateConfigPath(path: string): void {
  if (path === '') {
    return
  }
  if (path.startsWith('/') || WINDOWS_ABSOLUTE.test(path) || path.includes('..')) {
    throw new Error(`Invalid config-path '${path}'. Use a relative path inside the workspace.`)
  }
}

export function validateMode(mode: string): asserts mode is ActionMode {
  if (mode !== 'check' && mode !== 'fix') {
    throw new Error(`Invalid mode '${mode}'. Expected check or fix.`)
  }
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
  for (const path of parsePaths(raw)) {
    if (
      path.startsWith('-') ||
      path.startsWith('/') ||
      WINDOWS_ABSOLUTE.test(path) ||
      hasParentSegment(path) ||
      !isInsideWorkspace(workspace, path)
    ) {
      throw new Error(`Invalid path '${path}'. Use a relative path inside the workspace.`)
    }
  }
}

export function validateAllInputs(inputs: ActionInputs, workspace = process.cwd()): void {
  validatePhpCsFixerVersion(inputs.phpCsFixerVersion)
  validateUseFullRules(inputs.useFullRules)
  validateGitRef(inputs.rulesVersion)
  validateConfigPath(inputs.configPath)
  validateMode(inputs.mode)
  validatePaths(inputs.paths, workspace)
}
