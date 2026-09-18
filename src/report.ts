// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'
import type { AnnotationProperties } from '@actions/core'
import type { ActionMode } from './inputs'

export type Violation = {
  file: string
  fixers: string[]
  line?: number
  diff?: string
}

type FixerJsonFile = {
  name?: string
  appliedFixers?: unknown
  diff?: string
}

type FixerJsonReport = {
  files?: FixerJsonFile[]
}

export function extractJsonObject(output: string): unknown {
  let fallback: unknown
  let found = false
  for (let start = output.indexOf('{'); start !== -1; start = output.indexOf('{', start + 1)) {
    for (let end = output.lastIndexOf('}'); end > start; end = output.lastIndexOf('}', end - 1)) {
      try {
        const parsed: unknown = JSON.parse(output.slice(start, end + 1))
        found = true
        fallback = parsed
        if (parsed && typeof parsed === 'object' && parsed !== null && 'files' in parsed) {
          return parsed
        }
        break
      } catch {
        // Trailing braces or preamble — try an earlier '}'.
      }
    }
  }

  if (found) {
    return fallback
  }
  throw new Error('php-cs-fixer did not produce a JSON report.')
}

/** Pure JSON for the `code-style-result` Action output (empty report when stdout has no JSON). */
export const EMPTY_CODE_STYLE_RESULT = '{"files":[]}'

export function toCodeStyleResult(stdout: string): string {
  const trimmed = stdout.trim()
  if (trimmed === '') {
    return EMPTY_CODE_STYLE_RESULT
  }
  try {
    return JSON.stringify(extractJsonObject(trimmed))
  } catch {
    return EMPTY_CODE_STYLE_RESULT
  }
}

/**
 * First line for GitHub annotations: prefer the post-image (`+`) side of the
 * unified-diff hunk so annotations land on the fixed/new file content.
 */
export function firstChangedLine(diff: string): number | undefined {
  const hunk = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(diff)
  if (!hunk) {
    return undefined
  }
  const newSide = Number(hunk[2])
  const oldSide = Number(hunk[1])
  // Prefer + side when present; fall back to - side for pure-deletion hunks (+0).
  const line = newSide >= 1 ? newSide : oldSide >= 1 ? oldSide : 1
  if (!Number.isFinite(line) || line < 1) {
    return 1
  }
  return line
}

export function toRepoPath(file: string, workspace = process.cwd()): string {
  const normalized = file.replace(/\\/g, '/')
  const root = workspace.replace(/\\/g, '/').replace(/\/+$/, '')
  if (root !== '' && (normalized === root || normalized.startsWith(`${root}/`))) {
    return normalized.slice(root.length).replace(/^\/+/, '') || '.'
  }
  return normalized.replace(/^\.\//, '')
}

export function parseViolations(output: string, workspace = process.cwd()): Violation[] {
  const parsed = extractJsonObject(output) as FixerJsonReport
  if (!Array.isArray(parsed.files)) {
    return []
  }

  return parsed.files.flatMap((entry) => {
    if (typeof entry?.name !== 'string' || entry.name === '') {
      return []
    }
    const fixers = Array.isArray(entry.appliedFixers)
      ? entry.appliedFixers.filter((fixer): fixer is string => typeof fixer === 'string')
      : []
    const violation: Violation = {
      file: toRepoPath(entry.name, workspace),
      fixers,
    }
    const line = firstChangedLine(entry.diff ?? '')
    if (line !== undefined) {
      violation.line = line
    }
    if (typeof entry.diff === 'string' && entry.diff !== '') {
      violation.diff = entry.diff
    }
    return [violation]
  })
}

export function tryParseViolations(output: string, workspace = process.cwd()): Violation[] {
  try {
    return parseViolations(output, workspace)
  } catch {
    return []
  }
}

function escapeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

export function buildSummaryMarkdown(violations: Violation[], mode: ActionMode): string {
  if (violations.length === 0) {
    return ['## PHP CS Fixer', '', 'No coding standard violations found.', ''].join('\n')
  }

  const verb = mode === 'fix' ? 'rewritten' : 'with style violations'
  const rows = violations.map((violation) => {
    const fixers = violation.fixers.length > 0 ? escapeCell(violation.fixers.join(', ')) : '—'
    return `| \`${escapeCell(violation.file)}\` | ${fixers} | ${violation.fixers.length} |`
  })

  return [
    '## PHP CS Fixer',
    '',
    `Found **${violations.length}** file(s) ${verb}.`,
    '',
    '| File | Fixers | Count |',
    '| --- | --- | ---: |',
    ...rows,
    '',
  ].join('\n')
}

export async function writeJobSummary(markdown: string): Promise<void> {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return
  }
  await core.summary.addRaw(markdown, true).write()
}

export function emitAnnotations(violations: Violation[], mode: ActionMode): void {
  for (const violation of violations) {
    const message =
      violation.fixers.length > 0
        ? `Found violation(s) of type: ${violation.fixers.join(', ')}`
        : 'Found coding standard violations'
    const properties: AnnotationProperties = {
      title: 'PHP CS Fixer',
      file: violation.file,
    }
    if (violation.line !== undefined) {
      properties.startLine = violation.line
    }
    if (mode === 'fix') {
      core.warning(message, properties)
    } else {
      core.error(message, properties)
    }
  }
}

export async function publishReport(violations: Violation[], mode: ActionMode): Promise<void> {
  await writeJobSummary(buildSummaryMarkdown(violations, mode))
  emitAnnotations(violations, mode)
}

export function failWithoutGenericAnnotation(): void {
  process.exitCode = 1
}
