// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Subdirectory under RUNNER_TEMP (or os.tmpdir()) for Action runtime files. */
export const ACTION_RUNTIME_SUBDIR = 'php-cs-fixer-action'

export const RESULT_FILE = 'result.txt'

/** Prefer GitHub Actions RUNNER_TEMP so checkout stays free of phar/report/config debris. */
export function runnerTempRoot(): string {
  const fromEnv = process.env.RUNNER_TEMP?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : tmpdir()
}

export function actionRuntimeDir(root = runnerTempRoot()): string {
  return join(root, ACTION_RUNTIME_SUBDIR)
}

export async function ensureActionRuntimeDir(root?: string): Promise<string> {
  const dir = actionRuntimeDir(root)
  await mkdir(dir, { recursive: true })
  return dir
}

export function actionResultPath(runtimeDir?: string): string {
  return join(runtimeDir ?? actionRuntimeDir(), RESULT_FILE)
}
