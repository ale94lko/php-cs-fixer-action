import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { FIXER_BINARY } from './download-fixer'
import { ActionError, ActionErrorCode, ActionStep, toActionError } from './error-tracking'
import type { ActionMode } from './inputs'

export type FixerResult = {
  exitCode: number
  output: string
}

export type RunProcess = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => Promise<FixerResult>

export type RunFixerSettings = {
  workspace?: string
  runProcess?: RunProcess
  mode?: ActionMode
  paths?: string[]
}

export const BASE_FIXER_ARGS = [
  'fix',
  '--diff',
  '--show-progress=none',
  '--allow-risky=yes',
  '--format=json',
] as const

export function buildFixerArgs(
  configFile: string,
  mode: ActionMode = 'check',
  paths: string[] = [],
): string[] {
  const args: string[] = [...BASE_FIXER_ARGS]
  if (mode === 'check') {
    args.push('--dry-run')
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
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      process.stderr.write(text)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, output })
    })
  })
}

export async function runFixer(
  configFile: string,
  settings: RunFixerSettings = {},
): Promise<FixerResult> {
  const workspace = settings.workspace ?? process.cwd()
  const runProcess = settings.runProcess ?? spawnPhp
  const mode = settings.mode ?? 'check'
  const paths = settings.paths ?? []
  const configPath = join(workspace, configFile)
  try {
    await access(configPath, constants.F_OK)
  } catch {
    throw new ActionError(
      ActionStep.RunFixer,
      ActionErrorCode.ConfigNotFound,
      `Resolved config '${configFile}' does not exist.`,
    )
  }

  const env = {
    ...process.env,
    PHP_CS_FIXER_IGNORE_ENV: process.env.PHP_CS_FIXER_IGNORE_ENV ?? '1',
  }
  try {
    const result = await runProcess(
      'php',
      [join(workspace, FIXER_BINARY), ...buildFixerArgs(configFile, mode, paths)],
      { cwd: workspace, env },
    )
    await writeFile(join(workspace, 'result.txt'), result.output)
    return result
  } catch (error) {
    throw toActionError(ActionStep.RunFixer, ActionErrorCode.FixerFailed, error)
  }
}
