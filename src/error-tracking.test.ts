import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ActionError,
  ActionErrorCode,
  ActionStep,
  ERROR_TRACKING_URL_ENV,
  failurePayload,
  reportFailure,
  toActionError,
  trackingWebhookUrl,
} from './error-tracking'

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  summary: {
    addRaw: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  delete process.env[ERROR_TRACKING_URL_ENV]
})

describe('ActionError', () => {
  it('preserves step, code and message', () => {
    const error = new ActionError(ActionStep.ValidateInputs, ActionErrorCode.InvalidInput, 'bad')
    expect(error).toMatchObject({
      step: 'validate-inputs',
      code: 'INVALID_INPUT',
      message: 'bad',
    })
    expect(error).toBeInstanceOf(Error)
  })
})

describe('toActionError', () => {
  it('keeps an ActionError as-is', () => {
    const original = new ActionError(ActionStep.DownloadFixer, ActionErrorCode.ChecksumMismatch, 'mismatch')
    expect(toActionError(ActionStep.Run, ActionErrorCode.Unexpected, original)).toBe(original)
  })

  it('wraps a plain Error', () => {
    const wrapped = toActionError(ActionStep.RunFixer, ActionErrorCode.FixerFailed, new Error('spawn'))
    expect(wrapped).toMatchObject({
      step: 'run-fixer',
      code: 'FIXER_FAILED',
      message: 'spawn',
    })
  })
})

describe('trackingWebhookUrl', () => {
  it('is unset when the env var is missing or blank', () => {
    expect(trackingWebhookUrl({})).toBeUndefined()
    expect(trackingWebhookUrl({ [ERROR_TRACKING_URL_ENV]: '  ' })).toBeUndefined()
  })

  it('accepts http(s) URLs and ignores other schemes', () => {
    expect(trackingWebhookUrl({ [ERROR_TRACKING_URL_ENV]: 'https://example.test/hook' })).toBe(
      'https://example.test/hook',
    )
    expect(trackingWebhookUrl({ [ERROR_TRACKING_URL_ENV]: 'file:///tmp/out' })).toBeUndefined()
    expect(trackingWebhookUrl({ [ERROR_TRACKING_URL_ENV]: 'not a url' })).toBeUndefined()
  })
})

describe('reportFailure', () => {
  it('logs structured fields and setFailed, and does not POST when the URL is unset', async () => {
    const core = await import('@actions/core')
    const fetchImpl = vi.fn()
    const report = {
      step: ActionStep.ValidateInputs,
      code: ActionErrorCode.InvalidInput,
      message: 'Invalid php-cs-fixer-version',
    }

    await reportFailure(report, { fetchImpl })

    expect(core.info).toHaveBeenCalledWith(JSON.stringify(failurePayload(report)))
    expect(core.setFailed).toHaveBeenCalledWith('Invalid php-cs-fixer-version')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('POSTs JSON to ERROR_TRACKING_URL when set', async () => {
    process.env[ERROR_TRACKING_URL_ENV] = 'https://example.test/errors'
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    const report = {
      step: ActionStep.RunFixer,
      code: ActionErrorCode.FixerFailed,
      message: 'php-cs-fixer failed.',
    }

    await reportFailure(report, { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/errors',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(failurePayload(report)),
      }),
    )
  })

  it('does not fail the Action when the webhook errors', async () => {
    const core = await import('@actions/core')
    process.env[ERROR_TRACKING_URL_ENV] = 'https://example.test/errors'
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))

    await expect(
      reportFailure(
        { step: ActionStep.Run, code: ActionErrorCode.Unexpected, message: 'boom' },
        { fetchImpl },
      ),
    ).resolves.toBeUndefined()
    expect(core.setFailed).toHaveBeenCalledWith('boom')
    expect(core.warning).toHaveBeenCalledWith('Optional error tracking webhook failed; continuing.')
  })

  it('skips setFailed when fail is false', async () => {
    const core = await import('@actions/core')
    await reportFailure(
      {
        step: ActionStep.RunFixer,
        code: ActionErrorCode.StyleViolations,
        message: 'php-cs-fixer reported 1 file(s) with style violations.',
      },
      { fail: false, fetchImpl: vi.fn() },
    )
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('"code":"STYLE_VIOLATIONS"'))
  })
})
