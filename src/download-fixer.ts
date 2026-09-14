import { chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { downloadToFile, type DownloadOptions } from './http'

export const FIXER_BINARY = 'php-cs-fixer'

export function fixerReleaseUrl(version: string): string {
  return `https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${version}/php-cs-fixer.phar`
}

export async function downloadFixer(
  version: string,
  workspace = process.cwd(),
  options: DownloadOptions = {},
): Promise<string> {
  const dest = join(workspace, FIXER_BINARY)
  await downloadToFile(fixerReleaseUrl(version), dest, options)
  try {
    await chmod(dest, 0o755)
  } catch {
    // chmod is optional on Windows runners
  }
  return dest
}
