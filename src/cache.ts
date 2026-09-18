// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as core from '@actions/core'
import { isFeatureAvailable, restoreCache, saveCache } from '@actions/cache'

const CACHED_NAME = 'php-cs-fixer'

export type PharCache = {
  restore: (version: string, sha256: string) => Promise<string | undefined>
  save: (version: string, sha256: string, filePath: string) => Promise<void>
}

export function cacheKey(version: string, sha256: string): string {
  return `php-cs-fixer-phar-${version}-${sha256}`
}

export function cacheDir(version: string, sha256: string): string {
  const root = process.env.RUNNER_TOOL_CACHE ?? join(tmpdir(), 'php-cs-fixer-action-cache')
  return join(root, 'php-cs-fixer', version, sha256)
}

function cachedBinary(version: string, sha256: string): string {
  return join(cacheDir(version, sha256), CACHED_NAME)
}

export function createGithubPharCache(): PharCache {
  return {
    async restore(version, sha256) {
      if (!isFeatureAvailable()) {
        return undefined
      }
      const key = cacheKey(version, sha256)
      const dir = cacheDir(version, sha256)
      try {
        const hit = await restoreCache([dir], key)
        if (!hit) {
          return undefined
        }
        core.info(`Restored php-cs-fixer ${version} from cache (${key})`)
        return cachedBinary(version, sha256)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        core.warning(`Could not restore php-cs-fixer cache: ${message}`)
        return undefined
      }
    },
    async save(version, sha256, filePath) {
      if (!isFeatureAvailable()) {
        return
      }
      const key = cacheKey(version, sha256)
      const dir = cacheDir(version, sha256)
      try {
        await mkdir(dir, { recursive: true })
        await copyFile(filePath, cachedBinary(version, sha256))
        await saveCache([dir], key)
        core.info(`Saved php-cs-fixer ${version} to cache (${key})`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        core.warning(`Could not save php-cs-fixer cache: ${message}`)
      }
    },
  }
}

export function sha256Buffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export async function sha256File(path: string): Promise<string> {
  return sha256Buffer(await readFile(path))
}

export function assertChecksum(actual: string, expected: string, version: string): void {
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for php-cs-fixer ${version}. Expected ${expected}, got ${actual}.`,
    )
  }
}
