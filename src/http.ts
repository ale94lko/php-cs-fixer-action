// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { writeFile } from 'node:fs/promises'

export type FetchLike = typeof fetch

export type DownloadOptions = {
  fetchImpl?: FetchLike
  writeFileImpl?: (path: string, data: Buffer) => Promise<void>
  retries?: number
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
  /** Abort the request after this many ms (default 60s). */
  timeoutMs?: number
  /** Reject bodies larger than this many bytes (default 50 MiB). */
  maxBytes?: number
  /** Max redirect hops while staying on the download allowlist (default 5). */
  maxRedirects?: number
}

export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 60_000
export const DEFAULT_MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
export const DEFAULT_MAX_REDIRECTS = 5

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** github.com and *.githubusercontent.com (release assets / raw content). */
export function isAllowedDownloadHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host === 'github.com' || host.endsWith('.githubusercontent.com')
}

export function assertAllowedDownloadUrl(url: string): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid download URL: ${url}`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Download URL must be HTTPS: ${url}`)
  }
  if (!isAllowedDownloadHost(parsed.hostname)) {
    throw new Error(
      `Download host not allowed: ${parsed.hostname}. Allowed: github.com and *.githubusercontent.com`,
    )
  }
  return parsed
}

export async function readResponseBodyLimited(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null && contentLength !== '') {
    const declared = Number(contentLength)
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new Error(`Download Content-Length ${declared} exceeds maxBytes ${maxBytes}`)
    }
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const data = Buffer.from(await response.arrayBuffer())
    if (data.length > maxBytes) {
      throw new Error(`Download body ${data.length} exceeds maxBytes ${maxBytes}`)
    }
    return data
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value) {
        continue
      }
      total += value.byteLength
      if (total > maxBytes) {
        throw new Error(`Download body exceeds maxBytes ${maxBytes}`)
      }
      chunks.push(value)
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }
  return Buffer.concat(chunks)
}

type FetchAllowedOptions = {
  fetchImpl: FetchLike
  timeoutMs: number
  maxRedirects: number
}

/** Fetch with HTTPS allowlist hosts and no cross-host escape via redirects. */
export async function fetchAllowedDownload(
  url: string,
  options: FetchAllowedOptions,
): Promise<Response> {
  let current = assertAllowedDownloadUrl(url).toString()
  for (let hop = 0; hop <= options.maxRedirects; hop++) {
    const response = await options.fetchImpl(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error(`Redirect ${response.status} without Location from ${current}`)
      }
      const next = new URL(location, current)
      assertAllowedDownloadUrl(next.toString())
      current = next.toString()
      continue
    }
    return response
  }
  throw new Error(`Too many redirects (max ${options.maxRedirects}) fetching ${url}`)
}

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
  const timeoutMs = options.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS

  // Fail closed before retries when the URL itself is disallowed.
  assertAllowedDownloadUrl(url)

  let lastError: Error | undefined
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchAllowedDownload(url, { fetchImpl, timeoutMs, maxRedirects })
      if (!response.ok) {
        throw new Error(`Download failed (${response.status}) from ${url}`)
      }
      const data = await readResponseBodyLimited(response, maxBytes)
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
