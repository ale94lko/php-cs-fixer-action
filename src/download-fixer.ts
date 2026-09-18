// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { chmod, copyFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertChecksum, createGithubPharCache, sha256File, type PharCache } from './cache'
import { expectedChecksum, loadChecksums, resolveChecksumsPath } from './checksums'
import { ActionError, ActionErrorCode, ActionStep } from './error-tracking'
import { downloadToFile, type DownloadOptions } from './http'

export const FIXER_BINARY = 'php-cs-fixer'

/** Optional path to a pre-verified phar (e.g. local cache) so runtime can stay offline. */
export const VENDORED_PHAR_ENV = 'PHP_CS_FIXER_PHAR'

export type DownloadFixerOptions = DownloadOptions & {
  checksumsPath?: string
  checksums?: Map<string, string>
  cache?: PharCache
}

export function fixerReleaseUrl(version: string): string {
  return `https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${version}/php-cs-fixer.phar`
}

async function makeExecutable(path: string): Promise<void> {
  try {
    await chmod(path, 0o755)
  } catch {
    // chmod is optional on Windows runners
  }
}

async function installVerifiedPhar(
  source: string,
  dest: string,
  expected: string,
  version: string,
): Promise<boolean> {
  try {
    const hash = await sha256File(source)
    assertChecksum(hash, expected, version)
    if (resolve(source) !== resolve(dest)) {
      await copyFile(source, dest)
    }
    await makeExecutable(dest)
    return true
  } catch {
    return false
  }
}

export async function downloadFixer(
  version: string,
  workspace = process.cwd(),
  options: DownloadFixerOptions = {},
): Promise<string> {
  try {
    const dest = join(workspace, FIXER_BINARY)
    const table = options.checksums ?? (await loadChecksums(options.checksumsPath ?? resolveChecksumsPath()))
    const expected = expectedChecksum(version, table)
    const cache = options.cache ?? createGithubPharCache()

    if (await installVerifiedPhar(dest, dest, expected, version)) {
      return dest
    }

    const vendored = process.env[VENDORED_PHAR_ENV]
    if (vendored && (await installVerifiedPhar(vendored, dest, expected, version))) {
      return dest
    }

    const cached = await cache.restore(version, expected)
    if (cached) {
      const cachedHash = await sha256File(cached)
      try {
        assertChecksum(cachedHash, expected, version)
        await copyFile(cached, dest)
        await makeExecutable(dest)
        return dest
      } catch {
        await rm(cached, { force: true })
      }
    }

    await downloadToFile(fixerReleaseUrl(version), dest, options)
    const actual = await sha256File(dest)
    try {
      assertChecksum(actual, expected, version)
    } catch (error) {
      await rm(dest, { force: true })
      throw error
    }
    await makeExecutable(dest)
    await cache.save(version, expected, dest)
    return dest
  } catch (error) {
    if (error instanceof ActionError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    const code = message.includes('Checksum mismatch')
      ? ActionErrorCode.ChecksumMismatch
      : ActionErrorCode.DownloadFailed
    throw new ActionError(ActionStep.DownloadFixer, code, message)
  }
}
