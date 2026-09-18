// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { FIXER_BINARY } from './download-fixer'
import { ActionError, ActionErrorCode, ActionStep, toActionError } from './error-tracking'
import {
  DEFAULT_PHP_BIN,
  type ActionMode,
  type AllowRisky,
  type UsingCache,
} from './inputs'
import { RESULT_FILE, ensureActionRuntimeDir } from './runtime-dir'

export type FixerResult = {
  exitCode: number
  /** stdout only — php-cs-fixer JSON when using --format=json */
  output: string
  /** stderr text (also streamed to the job log); never mixed into output */
  stderr?: string
}

export type RunProcess = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => Promise<FixerResult>

export type BuildFixerArgsOptions = {
  mode?: ActionMode
  paths?: string[]
  allowRisky?: AllowRisky
  usingCache?: UsingCache | string
  cacheFile?: string
}

export type RunFixerSettings = {
  workspace?: string
  /** Process cwd (defaults to workspace). */
  cwd?: string
  /** Directory for the phar and JSON report (defaults to RUNNER_TEMP/php-cs-fixer-action). */
  runtimeDir?: string
  runProcess?: RunProcess
  mode?: ActionMode
  paths?: string[]
  allowRisky?: AllowRisky
  phpBin?: string
  usingCache?: string
  cacheFile?: string
}

export const BASE_FIXER_ARGS = [
  'fix',
  '--diff',
  '--show-progress=none',
  '--format=json',
] as const

export const PHP_NOT_FOUND_MESSAGE =
  'php was not found on PATH. Install PHP 8.3+ (for example shivammathur/setup-php) before running this Action.'

export function phpNotFoundMessage(phpBin: string): string {
  const bin = phpBin.trim() === '' ? DEFAULT_PHP_BIN : phpBin.trim()
  if (bin === DEFAULT_PHP_BIN) {
    return PHP_NOT_FOUND_MESSAGE
  }
  return `'${bin}' was not found. Install PHP 8.3+ (for example shivammathur/setup-php) or set php-bin to a valid PHP executable.`
}

/** True when spawn/runProcess failed because the php binary is missing. */
export function isPhpMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const err = error as NodeJS.ErrnoException
  if (err.code === 'ENOENT') {
    return true
  }
  const message = typeof err.message === 'string' ? err.message : ''
  return /spawn .+ENOENT/i.test(message)
}

export function buildFixerArgs(configFile: string, options: BuildFixerArgsOptions = {}): string[] {
  const mode = options.mode ?? 'check'
  const paths = options.paths ?? []
  const allowRisky = options.allowRisky ?? 'yes'
  const args: string[] = [
    BASE_FIXER_ARGS[0],
    BASE_FIXER_ARGS[1],
    BASE_FIXER_ARGS[2],
    `--allow-risky=${allowRisky}`,
    BASE_FIXER_ARGS[3],
  ]
  if (mode === 'check') {
    args.push('--dry-run')
  }
  const usingCache = options.usingCache?.trim() ?? ''
  if (usingCache === 'yes' || usingCache === 'no') {
    args.push(`--using-cache=${usingCache}`)
  }
  const cacheFile = options.cacheFile?.trim() ?? ''
  if (cacheFile !== '') {
    args.push(`--cache-file=${cacheFile}`)
  }
  args.push(`--config=${configFile}`, ...paths)
  return args
}

export function spawnPhp(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<FixerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      // Keep deprecation / diagnostic noise in job logs only — not in code-style-result.
      process.stderr.write(text)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, output: stdout, stderr })
    })
  })
}

export async function runFixer(
  configFile: string,
  settings: RunFixerSettings = {},
): Promise<FixerResult> {
  const workspace = settings.workspace ?? process.cwd()
  const cwd = settings.cwd ?? workspace
  const runtimeDir = settings.runtimeDir ?? (await ensureActionRuntimeDir())
  const runProcess = settings.runProcess ?? spawnPhp
  const mode = settings.mode ?? 'check'
  const paths = settings.paths ?? []
  const allowRisky = settings.allowRisky ?? 'yes'
  const phpBin = settings.phpBin?.trim() || DEFAULT_PHP_BIN
  const configPath = isAbsolute(configFile) ? configFile : join(workspace, configFile)
  const pathArgs = paths.map((path) => (isAbsolute(path) ? path : join(workspace, path)))
  const cacheFile = settings.cacheFile?.trim() ?? ''
  const cacheFileArg =
    cacheFile === '' ? '' : isAbsolute(cacheFile) ? cacheFile : join(workspace, cacheFile)

  try {
    await access(configPath, constants.F_OK)
  } catch {
    throw new ActionError(
      ActionStep.RunFixer,
      ActionErrorCode.ConfigNotFound,
      `Resolved config '${configFile}' does not exist.`,
    )
  }

  const env = { ...process.env }
  // Do not inject deprecated PHP_CS_FIXER_IGNORE_ENV. Prefer Config::setUnsupportedPhpVersionAllowed(true)
  // or --allow-unsupported-php-version=yes (see README). Consumers may still set the env themselves.
  try {
    const result = await runProcess(
      phpBin,
      [
        join(runtimeDir, FIXER_BINARY),
        ...buildFixerArgs(configPath, {
          mode,
          paths: pathArgs,
          allowRisky,
          usingCache: settings.usingCache,
          cacheFile: cacheFileArg,
        }),
      ],
      { cwd, env },
    )
    await writeFile(join(runtimeDir, RESULT_FILE), result.output)
    return result
  } catch (error) {
    if (isPhpMissingError(error)) {
      throw new ActionError(ActionStep.RunFixer, ActionErrorCode.PhpNotFound, phpNotFoundMessage(phpBin))
    }
    throw toActionError(ActionStep.RunFixer, ActionErrorCode.FixerFailed, error)
  }
}
