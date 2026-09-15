import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_CHECKSUMS_FILE = 'checksums.txt'
const SHA256_LINE = /^([a-fA-F0-9]{64})\s+(\S+)$/

export function parseChecksums(text: string): Map<string, string> {
  const table = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) {
      continue
    }
    const match = SHA256_LINE.exec(line)
    if (!match) {
      throw new Error(`Invalid checksums.txt line: '${line}'. Expected '<sha256>  <tag>'.`)
    }
    table.set(match[2], match[1].toLowerCase())
  }
  return table
}

export function resolveChecksumsPath(cwd = process.cwd(), fromDir = __dirname): string {
  const candidates = [join(fromDir, '..', DEFAULT_CHECKSUMS_FILE), join(cwd, DEFAULT_CHECKSUMS_FILE)]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error(
    `checksums.txt was not found. Place it next to action.yml (looked in ${candidates.join(', ')}).`,
  )
}

export async function loadChecksums(path: string): Promise<Map<string, string>> {
  return parseChecksums(await readFile(path, 'utf8'))
}

export function expectedChecksum(version: string, table: Map<string, string>): string {
  const hash = table.get(version)
  if (!hash) {
    throw new Error(
      `No SHA-256 checksum for php-cs-fixer ${version}. Add it to checksums.txt (see scripts/update-checksums.sh).`,
    )
  }
  return hash
}
