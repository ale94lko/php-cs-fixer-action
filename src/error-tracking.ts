// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import * as core from '@actions/core'

/** Optional webhook for Action failures. No-op when unset; never required in CI. */
export const ERROR_TRACKING_URL_ENV = 'ERROR_TRACKING_URL'

export const ActionStep = {
  ValidateInputs: 'validate-inputs',
  DownloadFixer: 'download-fixer',
  ResolveConfig: 'resolve-config',
  RunFixer: 'run-fixer',
  Run: 'run',
} as const

export const ActionErrorCode = {
  InvalidInput: 'INVALID_INPUT',
  DownloadFailed: 'DOWNLOAD_FAILED',
  ChecksumMismatch: 'CHECKSUM_MISMATCH',
  ConfigNotFound: 'CONFIG_NOT_FOUND',
  FixerFailed: 'FIXER_FAILED',
  StyleViolations: 'STYLE_VIOLATIONS',
  Unexpected: 'UNEXPECTED',
} as const

export type FailureReport = {
  step: string
  code: string
  message: string
}

export type ReportFailureOptions = {
  /** When false, do not call core.setFailed (style violations use file annotations). */
  fail?: boolean
  fetchImpl?: typeof fetch
}

const WEBHOOK_TIMEOUT_MS = 3000

export class ActionError extends Error {
  readonly step: string
  readonly code: string

  constructor(step: string, code: string, message: string) {
    super(message)
    this.name = 'ActionError'
    this.step = step
    this.code = code
  }
}

export function toActionError(step: string, code: string, error: unknown): ActionError {
  if (error instanceof ActionError) {
    return error
  }
  const message = error instanceof Error ? error.message : String(error)
  return new ActionError(step, code, message)
}

export function failurePayload(report: FailureReport): FailureReport {
  return {
    step: report.step,
    code: report.code,
    message: report.message,
  }
}

export function trackingWebhookUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env[ERROR_TRACKING_URL_ENV]?.trim()
  if (!raw) {
    return undefined
  }
  try {
    const parsed = new URL(raw)
    // HTTPS-only to reduce SSRF / cleartext risk for optional failure webhooks.
    if (parsed.protocol !== 'https:') {
      return undefined
    }
    return raw
  } catch {
    return undefined
  }
}

async function postTracking(
  payload: FailureReport,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const url = trackingWebhookUrl()
  if (!url) {
    return
  }
  try {
    await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
  } catch {
    core.warning('Optional error tracking webhook failed; continuing.')
  }
}

/**
 * Single failure path: structured `{step,code,message}` log, GitHub `::error::`
 * via setFailed (unless `fail: false`), and an optional webhook POST.
 */
export async function reportFailure(
  report: FailureReport,
  options: ReportFailureOptions = {},
): Promise<void> {
  const payload = failurePayload(report)
  core.info(JSON.stringify(payload))
  if (options.fail !== false) {
    core.setFailed(payload.message)
  }
  await postTracking(payload, options.fetchImpl ?? fetch)
}
