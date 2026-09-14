import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { FIXER_BINARY } from './download-fixer'

export type FixerResult = {
  exitCode: number
  output: string
}

export type RunProcess = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => Promise<FixerResult>

export const FIXER_ARGS = [
  'fix',
  '--verbose',
  '--diff',
  '--show-progress=none',
  '--allow-risky=yes',
  '--dry-run',
  '--format=txt',
] as const

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
  workspace = process.cwd(),
  runProcess: RunProcess = spawnPhp,
): Promise<FixerResult> {
  const configPath = join(workspace, configFile)
  try {
    await access(configPath, constants.F_OK)
  } catch {
    throw new Error(`Resolved config '${configFile}' does not exist.`)
  }

  const env = {
    ...process.env,
    PHP_CS_FIXER_IGNORE_ENV: process.env.PHP_CS_FIXER_IGNORE_ENV ?? '1',
  }
  const result = await runProcess(
    'php',
    [join(workspace, FIXER_BINARY), ...FIXER_ARGS, `--config=${configFile}`],
    { cwd: workspace, env },
  )
  await writeFile(join(workspace, 'result.txt'), result.output)
  return result
}
