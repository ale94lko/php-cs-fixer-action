import { describe, expect, it, vi } from 'vitest'
import { downloadToFile } from './http'

describe('downloadToFile', () => {
  it('writes the response body on HTTP 200', async () => {
    const writeFileImpl = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('phar-bytes').buffer,
    })

    await downloadToFile('https://example.test/php-cs-fixer.phar', 'php-cs-fixer', {
      fetchImpl,
      writeFileImpl,
    })

    expect(writeFileImpl).toHaveBeenCalledOnce()
    const written = writeFileImpl.mock.calls[0][1] as Buffer
    expect(written.toString()).toBe('phar-bytes')
  })

  it('retries a 404 and then fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(
      downloadToFile('https://example.test/missing', 'php-cs-fixer', {
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
})
