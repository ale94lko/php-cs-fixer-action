// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest'
import {
  assertAllowedDownloadUrl,
  downloadToFile,
  fetchAllowedDownload,
  isAllowedDownloadHost,
  readResponseBodyLimited,
} from './http'

const GITHUB_PHAR = 'https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/v3.95.21/php-cs-fixer.phar'
const RAW_RULES =
  'https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/v1.0.1/.php-cs-fixer.dist.php'

describe('isAllowedDownloadHost', () => {
  it('allows github.com and githubusercontent CDN hosts', () => {
    expect(isAllowedDownloadHost('github.com')).toBe(true)
    expect(isAllowedDownloadHost('raw.githubusercontent.com')).toBe(true)
    expect(isAllowedDownloadHost('objects.githubusercontent.com')).toBe(true)
    expect(isAllowedDownloadHost('evil.example')).toBe(false)
    expect(isAllowedDownloadHost('github.com.evil.example')).toBe(false)
  })
})

describe('assertAllowedDownloadUrl', () => {
  it('requires HTTPS on an allowlisted host', () => {
    expect(assertAllowedDownloadUrl(GITHUB_PHAR).hostname).toBe('github.com')
    expect(() => assertAllowedDownloadUrl('http://github.com/x')).toThrow(/HTTPS/)
    expect(() => assertAllowedDownloadUrl('https://evil.example/x')).toThrow(/not allowed/)
  })
})

describe('readResponseBodyLimited', () => {
  it('rejects oversized Content-Length before reading', async () => {
    await expect(
      readResponseBodyLimited(
        {
          headers: { get: (name: string) => (name === 'content-length' ? '100' : null) },
          body: null,
          arrayBuffer: async () => new ArrayBuffer(0),
        } as unknown as Response,
        50,
      ),
    ).rejects.toThrow(/Content-Length/)
  })

  it('rejects oversized arrayBuffer bodies', async () => {
    await expect(
      readResponseBodyLimited(
        {
          headers: { get: () => null },
          body: null,
          arrayBuffer: async () => new TextEncoder().encode('too-large-body').buffer,
        } as unknown as Response,
        4,
      ),
    ).rejects.toThrow(/exceeds maxBytes/)
  })

  it('streams with a byte cap', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
    let i = 0
    const body = {
      getReader: () => ({
        read: async () => {
          if (i >= chunks.length) {
            return { done: true as const, value: undefined }
          }
          return { done: false as const, value: chunks[i++] }
        },
        releaseLock: () => undefined,
        cancel: async () => undefined,
      }),
    }
    await expect(
      readResponseBodyLimited(
        {
          headers: { get: () => null },
          body,
        } as unknown as Response,
        3,
      ),
    ).rejects.toThrow(/exceeds maxBytes/)
  })
})

describe('fetchAllowedDownload', () => {
  it('follows same-allowlist redirects and rejects cross-host escapes', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        headers: { get: (name: string) => (name === 'location' ? 'https://evil.example/x' : null) },
      })
    await expect(
      fetchAllowedDownload(GITHUB_PHAR, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 1000,
        maxRedirects: 3,
      }),
    ).rejects.toThrow(/not allowed/)
  })

  it('follows redirects to objects.githubusercontent.com', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          get: (name: string) =>
            name === 'location' ? 'https://objects.githubusercontent.com/phar' : null,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => null },
      })
    const response = await fetchAllowedDownload(GITHUB_PHAR, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 1000,
      maxRedirects: 3,
    })
    expect(response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })
})

describe('downloadToFile', () => {
  it('writes the response body on HTTP 200', async () => {
    const writeFileImpl = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: null,
      arrayBuffer: async () => new TextEncoder().encode('phar-bytes').buffer,
    })

    await downloadToFile(GITHUB_PHAR, 'php-cs-fixer', {
      fetchImpl,
      writeFileImpl,
    })

    expect(writeFileImpl).toHaveBeenCalledOnce()
    const written = writeFileImpl.mock.calls[0][1] as Buffer
    expect(written.toString()).toBe('phar-bytes')
  })

  it('rejects disallowed hosts before fetching', async () => {
    const fetchImpl = vi.fn()
    await expect(
      downloadToFile('https://evil.example/php-cs-fixer.phar', 'php-cs-fixer', {
        fetchImpl,
        writeFileImpl: vi.fn(),
      }),
    ).rejects.toThrow(/not allowed/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('retries a 404 and then fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => null } })
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(
      downloadToFile(RAW_RULES, 'php-cs-fixer', {
        fetchImpl,
        writeFileImpl: vi.fn(),
        retries: 3,
        delayMs: 1,
        sleep,
      }),
    ).rejects.toThrow(/Download failed \(404\)/)

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('fails when the body exceeds maxBytes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: null,
      arrayBuffer: async () => new TextEncoder().encode('0123456789').buffer,
    })
    await expect(
      downloadToFile(GITHUB_PHAR, 'php-cs-fixer', {
        fetchImpl,
        writeFileImpl: vi.fn(),
        maxBytes: 4,
        retries: 1,
      }),
    ).rejects.toThrow(/maxBytes/)
  })

  it('surfaces AbortSignal timeout errors', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted')
      err.name = 'TimeoutError'
      return Promise.reject(err)
    })
    await expect(
      downloadToFile(GITHUB_PHAR, 'php-cs-fixer', {
        fetchImpl,
        writeFileImpl: vi.fn(),
        retries: 1,
        timeoutMs: 1,
      }),
    ).rejects.toThrow(/aborted|Timeout/i)
  })
})
