// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { spawn } from 'node:child_process'
import { ActionError, ActionErrorCode, ActionStep, toActionError } from './error-tracking'

export type GitExec = (args: string[], cwd: string) => Promise<string>

/** Run `git` and return stdout; fail closed on non-zero exit. */
export function defaultGitExec(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || `git ${args.join(' ')} exited with code ${code ?? 1}`))
    })
  })
}

export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Keep Added/Copied/Modified/Renamed paths that look like PHP sources. */
export function filterPhpPaths(files: string[]): string[] {
  return files
    .map((file) => normalizeRepoPath(file.trim()))
    .filter((file) => file !== '' && /\.php$/i.test(file))
}

/**
 * Resolve the git base for `base...HEAD`.
 * Prefer the explicit `base-ref` input; otherwise `origin/$GITHUB_BASE_REF` on pull_request.
 */
export function resolveDiffBaseRef(baseRefInput: string): string {
  const trimmed = baseRefInput.trim()
  if (trimmed !== '') {
    return trimmed
  }
  const githubBase = process.env.GITHUB_BASE_REF?.trim()
  if (githubBase && githubBase.length > 0) {
    return `origin/${githubBase}`
  }
  throw new ActionError(
    ActionStep.ValidateInputs,
    ActionErrorCode.InvalidInput,
    'only-changed requires base-ref (or GITHUB_BASE_REF on pull_request).',
  )
}

/** When `paths` is set, keep changed files that match a filter path or live under it. */
export function restrictToPathFilters(changed: string[], filters: string[]): string[] {
  if (filters.length === 0) {
    return changed
  }
  const norms = filters.map(normalizeRepoPath)
  return changed.filter((file) => {
    const n = normalizeRepoPath(file)
    return norms.some((filter) => n === filter || n.startsWith(`${filter}/`))
  })
}

export type ListChangedPhpPathsOptions = {
  workspace?: string
  baseRef?: string
  pathFilters?: string[]
  gitExec?: GitExec
}

/** List PHP files changed vs `base...HEAD`, optionally restricted by `paths` filters. */
export async function listChangedPhpPaths(
  options: ListChangedPhpPathsOptions = {},
): Promise<string[]> {
  const workspace = options.workspace ?? process.cwd()
  const gitExec = options.gitExec ?? defaultGitExec
  const base = resolveDiffBaseRef(options.baseRef ?? '')
  try {
    const stdout = await gitExec(
      ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
      workspace,
    )
    const changed = filterPhpPaths(stdout.split(/\r?\n/))
    return restrictToPathFilters(changed, options.pathFilters ?? [])
  } catch (error) {
    throw toActionError(ActionStep.ValidateInputs, ActionErrorCode.InvalidInput, error)
  }
}
