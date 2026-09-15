import { chmod, copyFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { assertChecksum, createGithubPharCache, sha256File, type PharCache } from './cache'
import { expectedChecksum, loadChecksums, resolveChecksumsPath } from './checksums'
import { downloadToFile, type DownloadOptions } from './http'

export const FIXER_BINARY = 'php-cs-fixer'

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

export async function downloadFixer(
  version: string,
  workspace = process.cwd(),
  options: DownloadFixerOptions = {},
): Promise<string> {
  const dest = join(workspace, FIXER_BINARY)
  const table = options.checksums ?? (await loadChecksums(options.checksumsPath ?? resolveChecksumsPath()))
  const expected = expectedChecksum(version, table)
  const cache = options.cache ?? createGithubPharCache()

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
}
