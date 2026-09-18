// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ActionErrorCode } from './error-tracking'
import {
  buildFixerArgs,
  isPhpMissingError,
  PHP_NOT_FOUND_MESSAGE,
  runFixer,
  spawnPhp,
} from './run-fixer'

describe('isPhpMissingError', () => {
  it('detects ENOENT from spawn', () => {
    const err = Object.assign(new Error('spawn php ENOENT'), { code: 'ENOENT' })
    expect(isPhpMissingError(err)).toBe(true)
    expect(isPhpMissingError(new Error('other'))).toBe(false)
    expect(isPhpMissingError(null)).toBe(false)
  })
})

describe('runFixer', () => {
  it('fails when the resolved config is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(runFixer('missing.php', { workspace, runProcess: vi.fn() })).rejects.toThrow(
      /does not exist/,
    )
  })

  it('fails with PHP_NOT_FOUND when php is missing from PATH', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const enoent = Object.assign(new Error('spawn php ENOENT'), { code: 'ENOENT' })
    const runProcess = vi.fn().mockRejectedValue(enoent)

    await expect(
      runFixer('config.php', { workspace, runtimeDir: workspace, runProcess }),
    ).rejects.toMatchObject({
      code: ActionErrorCode.PhpNotFound,
      message: PHP_NOT_FOUND_MESSAGE,
    })
    expect(PHP_NOT_FOUND_MESSAGE).toMatch(/shivammathur\/setup-php/)
  })

  it('maps other spawn failures to FIXER_FAILED', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockRejectedValue(new Error('EACCES'))
    await expect(
      runFixer('config.php', { workspace, runtimeDir: workspace, runProcess }),
    ).rejects.toMatchObject({ code: ActionErrorCode.FixerFailed })
  })

  it('applies runFixer defaults for mode, paths, and allowRisky', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')
    const runProcess = vi.fn().mockResolvedValue({ exitCode: 0, output: '{}', stderr: '' })

    await runFixer(join(workspace, 'config.php'), {
      workspace,
      runtimeDir: workspace,
      runProcess,
    })

    const args = runProcess.mock.calls[0]?.[1] as string[]
    expect(args).toContain('--dry-run')
    expect(args).toContain('--allow-risky=yes')
    expect(args.at(-1)).toContain('config.php')
  })

  it('wraps non-Error spawn rejections as FIXER_FAILED', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')
    const runProcess = vi.fn().mockRejectedValue('spawn blew up')
    await expect(
      runFixer('config.php', { workspace, runtimeDir: workspace, runProcess }),
    ).rejects.toMatchObject({
      code: ActionErrorCode.FixerFailed,
      message: 'spawn blew up',
    })
  })

  it('runs php-cs-fixer dry-run and writes result.txt under the runtime dir', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile, readFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockResolvedValue({ exitCode: 8, output: 'violations' })
    const configPath = join(workspace, 'config.php')
    const result = await runFixer('config.php', {
      workspace,
      runtimeDir: workspace,
      runProcess,
    })

    expect(result.exitCode).toBe(8)
    expect(runProcess).toHaveBeenCalledWith(
      'php',
      [join(workspace, 'php-cs-fixer'), ...buildFixerArgs(configPath)],
      expect.objectContaining({ cwd: workspace }),
    )
    await expect(readFile(join(workspace, 'result.txt'), 'utf8')).resolves.toBe('violations')
  })

  it('does not inject deprecated PHP_CS_FIXER_IGNORE_ENV when unset', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')
    const previous = process.env.PHP_CS_FIXER_IGNORE_ENV
    delete process.env.PHP_CS_FIXER_IGNORE_ENV

    try {
      const runProcess = vi.fn().mockResolvedValue({ exitCode: 0, output: 'ok' })
      await runFixer('config.php', { workspace, runtimeDir: workspace, runProcess })
      const env = runProcess.mock.calls[0]?.[2]?.env as NodeJS.ProcessEnv
      expect(env.PHP_CS_FIXER_IGNORE_ENV).toBeUndefined()
    } finally {
      if (previous === undefined) {
        delete process.env.PHP_CS_FIXER_IGNORE_ENV
      } else {
        process.env.PHP_CS_FIXER_IGNORE_ENV = previous
      }
    }
  })

  it('spawnPhp captures stdout only in output', async () => {
    const result = await spawnPhp(process.execPath, ['-e', 'process.stdout.write("hi")'], {
      cwd: process.cwd(),
      env: process.env,
    })
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('hi')
    expect(result.stderr).toBe('')
  })

  it('spawnPhp keeps stderr out of output while capturing exit codes', async () => {
    const result = await spawnPhp(
      process.execPath,
      ['-e', 'process.stderr.write("err"); process.exit(2)'],
      { cwd: process.cwd(), env: process.env },
    )
    expect(result.exitCode).toBe(2)
    expect(result.output).toBe('')
    expect(result.stderr).toBe('err')
  })

  it('spawnPhp does not mix stderr deprecation noise into stdout JSON', async () => {
    const script = [
      'process.stderr.write("Deprecated: PHP_CS_FIXER_IGNORE_ENV {legacy}\\n");',
      'process.stdout.write("{\\"files\\":[]}");',
    ].join('')
    const result = await spawnPhp(process.execPath, ['-e', script], {
      cwd: process.cwd(),
      env: process.env,
    })
    expect(result.output).toBe('{"files":[]}')
    expect(result.stderr).toContain('PHP_CS_FIXER_IGNORE_ENV')
    expect(result.output).not.toContain('Deprecated')
  })

  it('spawnPhp rejects with ENOENT when the command is missing', async () => {
    await expect(
      spawnPhp('php-cs-fixer-action-missing-binary-128', [], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('returns success when php-cs-fixer exits 0', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockResolvedValue({ exitCode: 0, output: 'ok' })
    await expect(
      runFixer('config.php', { workspace, runtimeDir: workspace, runProcess }),
    ).resolves.toMatchObject({
      exitCode: 0,
    })
  })

  it('omits --dry-run and forwards paths in fix mode', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockResolvedValue({ exitCode: 0, output: 'fixed' })
    await runFixer('config.php', {
      workspace,
      runtimeDir: workspace,
      runProcess,
      mode: 'fix',
      paths: ['src'],
    })

    const args = runProcess.mock.calls[0]?.[1] as string[]
    expect(args).not.toContain('--dry-run')
    expect(args).toContain('src')
    expect(args).toContain(`--config=${join(workspace, 'config.php')}`)
  })
})

describe('buildFixerArgs', () => {
  it('includes --dry-run in check mode and defaults allow-risky to yes', () => {
    expect(buildFixerArgs('config.php', 'check')).toContain('--dry-run')
    expect(buildFixerArgs('config.php', 'check')).toContain('--config=config.php')
    expect(buildFixerArgs('config.php', 'check')).toContain('--format=json')
    expect(buildFixerArgs('config.php', 'check')).toContain('--allow-risky=yes')
  })

  it('honors allow-risky=no', () => {
    expect(buildFixerArgs('config.php', 'check', [], 'no')).toContain('--allow-risky=no')
    expect(buildFixerArgs('config.php', 'check', [], 'no')).not.toContain('--allow-risky=yes')
  })

  it('omits --dry-run in fix mode and appends paths', () => {
    const args = buildFixerArgs('config.php', 'fix', ['src', 'tests/fixtures/Dirty.php'])
    expect(args).not.toContain('--dry-run')
    expect(args).toContain('--allow-risky=yes')
    expect(args.slice(-3)).toEqual(['--config=config.php', 'src', 'tests/fixtures/Dirty.php'])
  })
})
