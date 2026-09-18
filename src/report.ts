// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'
import type { AnnotationProperties } from '@actions/core'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('php-cs-fixer did not produce a JSON report.')
  }
  return JSON.parse(output.slice(start, end + 1)) as unknown
}

export function firstChangedLine(diff: string): number | undefined {
  const match = /@@ -(\d+)/.exec(diff)
  if (!match) {
    return undefined
  }
  const line = Number(match[1])
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

export type SarifLevel = 'error' | 'warning' | 'note' | 'none'

export type SarifResult = {
  ruleId: string
  level: SarifLevel
  message: { text: string }
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string }
      region?: { startLine: number }
    }
  }>
}

export type SarifLog = {
  $schema: string
  version: '2.1.0'
  runs: Array<{
    tool: {
      driver: {
        name: string
        informationUri: string
        rules: Array<{ id: string; shortDescription: { text: string } }>
      }
    }
    results: SarifResult[]
  }>
}

const SARIF_SCHEMA_URI = 'https://json.schemastore.org/sarif-2.1.0.json'

/** Build a SARIF 2.1.0 log from php-cs-fixer violations (one result per fixer). */
export function buildSarif(violations: Violation[], mode: ActionMode): SarifLog {
  const level: SarifLevel = mode === 'fix' ? 'warning' : 'error'
  const rules = new Map<string, { id: string; shortDescription: { text: string } }>()
  const results: SarifResult[] = []

  for (const violation of violations) {
    const ruleIds = violation.fixers.length > 0 ? violation.fixers : ['php-cs-fixer']
    for (const ruleId of ruleIds) {
      if (!rules.has(ruleId)) {
        rules.set(ruleId, {
          id: ruleId,
          shortDescription: {
            text:
              ruleId === 'php-cs-fixer'
                ? 'PHP CS Fixer coding standard violation'
                : `PHP CS Fixer rule: ${ruleId}`,
          },
        })
      }

      const message =
        ruleId === 'php-cs-fixer' && violation.fixers.length === 0
          ? 'Found coding standard violations'
          : `Found violation of type: ${ruleId}`

      const physicalLocation: SarifResult['locations'][number]['physicalLocation'] = {
        artifactLocation: { uri: violation.file.replace(/\\/g, '/') },
      }
      if (violation.line !== undefined) {
        physicalLocation.region = { startLine: violation.line }
      }

      results.push({
        ruleId,
        level,
        message: { text: message },
        locations: [{ physicalLocation }],
      })
    }
  }

  return {
    $schema: SARIF_SCHEMA_URI,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'PHP CS Fixer',
            informationUri: 'https://github.com/PHP-CS-Fixer/PHP-CS-Fixer',
            rules: [...rules.values()],
          },
        },
        results,
      },
    ],
  }
}

export async function writeSarifFile(
  relativePath: string,
  violations: Violation[],
  mode: ActionMode,
  workspace = process.cwd(),
): Promise<void> {
  const dest = join(workspace, relativePath)
  await mkdir(dirname(dest), { recursive: true })
  const payload = `${JSON.stringify(buildSarif(violations, mode), null, 2)}\n`
  await writeFile(dest, payload, 'utf8')
  core.info(`Wrote SARIF report to ${relativePath}`)
}

export function failWithoutGenericAnnotation(): void {
  process.exitCode = 1
}
