import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildFixerArgs, runFixer, spawnPhp } from './run-fixer'

describe('runFixer', () => {
  it('fails when the resolved config is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    await expect(runFixer('missing.php', { workspace, runProcess: vi.fn() })).rejects.toThrow(
      /does not exist/,
    )
  })

  it('runs php-cs-fixer dry-run and writes result.txt', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile, readFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockResolvedValue({ exitCode: 8, output: 'violations' })
    const result = await runFixer('config.php', { workspace, runProcess })

    expect(result.exitCode).toBe(8)
    expect(runProcess).toHaveBeenCalledWith(
      'php',
      expect.arrayContaining([...buildFixerArgs('config.php'), '--dry-run', '--config=config.php']),
      expect.objectContaining({ cwd: workspace }),
    )
    await expect(readFile(join(workspace, 'result.txt'), 'utf8')).resolves.toBe('violations')
  })

  it('spawnPhp captures stdout from a child process', async () => {
    const result = await spawnPhp(process.execPath, ['-e', 'process.stdout.write("hi")'], {
      cwd: process.cwd(),
      env: process.env,
    })
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('hi')
  })

  it('spawnPhp captures stderr and non-zero exit codes', async () => {
    const result = await spawnPhp(
      process.execPath,
      ['-e', 'process.stderr.write("err"); process.exit(2)'],
      { cwd: process.cwd(), env: process.env },
    )
    expect(result.exitCode).toBe(2)
    expect(result.output).toBe('err')
  })

  it('returns success when php-cs-fixer exits 0', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'php-cs-fixer-action-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(workspace, 'config.php'), '<?php\n')

    const runProcess = vi.fn().mockResolvedValue({ exitCode: 0, output: 'ok' })
    await expect(
      runFixer('config.php', { workspace, runProcess }),
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
      runProcess,
      mode: 'fix',
      paths: ['src'],
    })

    const args = runProcess.mock.calls[0]?.[1] as string[]
    expect(args).not.toContain('--dry-run')
    expect(args).toContain('src')
    expect(args).toContain('--config=config.php')
  })
})

describe('buildFixerArgs', () => {
  it('includes --dry-run in check mode', () => {
    expect(buildFixerArgs('config.php', 'check')).toContain('--dry-run')
    expect(buildFixerArgs('config.php', 'check')).toContain('--config=config.php')
    expect(buildFixerArgs('config.php', 'check')).toContain('--format=json')
  })

  it('omits --dry-run in fix mode and appends paths', () => {
    const args = buildFixerArgs('config.php', 'fix', ['src', 'tests/fixtures/Dirty.php'])
    expect(args).not.toContain('--dry-run')
    expect(args.slice(-3)).toEqual(['--config=config.php', 'src', 'tests/fixtures/Dirty.php'])
  })
})
