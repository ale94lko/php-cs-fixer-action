import { writeFile } from 'node:fs/promises'

export type FetchLike = typeof fetch

export type DownloadOptions = {
  fetchImpl?: FetchLike
  writeFileImpl?: (path: string, data: Buffer) => Promise<void>
  retries?: number
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export async function downloadToFile(
  url: string,
  dest: string,
  options: DownloadOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch
  const writeFileImpl = options.writeFileImpl ?? writeFile
  const retries = options.retries ?? 3
  const delayMs = options.delayMs ?? 2000
  const sleep = options.sleep ?? defaultSleep

  let lastError: Error | undefined
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchImpl(url, { redirect: 'follow' })
      if (!response.ok) {
        throw new Error(`Download failed (${response.status}) from ${url}`)
      }
      const data = Buffer.from(await response.arrayBuffer())
      await writeFileImpl(dest, data)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < retries) {
        await sleep(delayMs)
      }
    }
  }

  throw lastError ?? new Error(`Download failed from ${url}`)
}
