import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function canonicalizeDistText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[ \t]*\/\/# sourceMappingURL=.*(?:\n|$)/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '\n')
}

export function canonicalizeDistFiles(distDir: string): void {
  for (const name of readdirSync(distDir)) {
    const path = join(distDir, name)
    if (!statSync(path).isFile()) {
      continue
    }

    const original = readFileSync(path, 'utf8')
    const next =
      name.endsWith('.js') || name === 'licenses'
        ? canonicalizeDistText(original)
        : original.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    if (next !== original) {
      writeFileSync(path, next)
    }
  }
}
