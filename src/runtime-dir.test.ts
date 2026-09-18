// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ACTION_RUNTIME_SUBDIR,
  RESULT_FILE,
  actionResultPath,
  actionRuntimeDir,
  runnerTempRoot,
} from './runtime-dir'

const originalRunnerTemp = process.env.RUNNER_TEMP

afterEach(() => {
  if (originalRunnerTemp === undefined) {
    delete process.env.RUNNER_TEMP
  } else {
    process.env.RUNNER_TEMP = originalRunnerTemp
  }
})

describe('runnerTempRoot', () => {
  it('prefers RUNNER_TEMP when set', () => {
    process.env.RUNNER_TEMP = '/tmp/github-runner'
    expect(runnerTempRoot()).toBe('/tmp/github-runner')
  })

  it('falls back to os.tmpdir when RUNNER_TEMP is empty', () => {
    process.env.RUNNER_TEMP = '   '
    expect(runnerTempRoot().length).toBeGreaterThan(0)
    expect(runnerTempRoot()).not.toBe('   ')
  })
})

describe('actionRuntimeDir', () => {
  it('nests under the runner temp root', () => {
    expect(actionRuntimeDir('/tmp/runner')).toBe(join('/tmp/runner', ACTION_RUNTIME_SUBDIR))
  })
})

describe('actionResultPath', () => {
  it('points at result.txt under the runtime dir', () => {
    expect(actionResultPath('/tmp/runtime')).toBe(join('/tmp/runtime', RESULT_FILE))
  })
})
