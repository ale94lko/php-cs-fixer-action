#!/usr/bin/env node
// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

/**
 * Commit files from DIST_DIR onto BRANCH via the Git Data API.
 *
 * Does not check out the target branch, so a privileged workflow_run job can
 * update dist/ without an untrusted pull-request checkout.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://api.github.com'

export class CommitDistError extends Error {}

export function fail(message) {
  throw new CommitDistError(message)
}

export function env(name, source = process.env) {
  const value = (source[name] ?? '').trim()
  if (!value) {
    fail(`${name} is required`)
  }
  return value
}

export function encodePathSegment(value) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

export async function api(token, method, path, body, fetchImpl = fetch) {
  const response = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'php-cs-fixer-action-commit-dist',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.text()
  if (!response.ok) {
    fail(`GitHub API ${method} ${path} failed (${response.status}): ${payload}`)
  }
  return payload === '' ? {} : JSON.parse(payload)
}

export function distFiles(root) {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      files.push([relative(root, path).replaceAll('\\', '/'), path])
    }
  }
  walk(root)
  files.sort((a, b) => a[0].localeCompare(b[0]))
  if (files.length === 0) {
    fail(`No files found in ${root}`)
  }
  return files
}

export function assertDistDir(distDir) {
  try {
    if (!statSync(distDir).isDirectory()) {
      fail(`DIST_DIR is not a directory: ${distDir}`)
    }
  } catch (error) {
    if (error instanceof CommitDistError) {
      throw error
    }
    fail(`DIST_DIR is not a directory: ${distDir}`)
  }

  const index = join(distDir, 'index.js')
  let bundle
  try {
    bundle = readFileSync(index, 'utf8')
  } catch {
    fail(`Missing ${index}`)
  }
  if (bundle.includes('webpackMissingModule')) {
    fail(
      'dist/index.js contains webpackMissingModule; ncc could not bundle a dependency. ' +
        'Keep @actions/cache on ^4.1.0 and @actions/core on ^1.11.1 (CJS).',
    )
  }
  return bundle
}

/**
 * @param {{
 *   envSource?: NodeJS.ProcessEnv
 *   fetchImpl?: typeof fetch
 *   log?: (message: string) => void
 * }} [options]
 */
export async function runCommitDistTree(options = {}) {
  const envSource = options.envSource ?? process.env
  const fetchImpl = options.fetchImpl ?? fetch
  const log = options.log ?? console.log

  const distDir = resolve(env('DIST_DIR', envSource))
  assertDistDir(distDir)

  const token = env('GH_TOKEN', envSource)
  const repo = encodePathSegment(env('GITHUB_REPOSITORY', envSource))
  const branch = encodePathSegment(env('BRANCH', envSource))
  const parentSha = env('PARENT_SHA', envSource)
  const refPath = `/repos/${repo}/git/refs/heads/${branch}`

  const parent = await api(token, 'GET', `/repos/${repo}/git/commits/${parentSha}`, undefined, fetchImpl)
  const entries = []
  for (const [rel, path] of distFiles(distDir)) {
    const blob = await api(
      token,
      'POST',
      `/repos/${repo}/git/blobs`,
      {
        content: readFileSync(path).toString('base64'),
        encoding: 'base64',
      },
      fetchImpl,
    )
    entries.push({ path: `dist/${rel}`, mode: '100644', type: 'blob', sha: blob.sha })
  }

  const tree = await api(
    token,
    'POST',
    `/repos/${repo}/git/trees`,
    {
      base_tree: parent.tree.sha,
      tree: entries,
    },
    fetchImpl,
  )
  if (tree.sha === parent.tree.sha) {
    log('dist/ already up to date')
    return { updated: false }
  }

  const commit = await api(
    token,
    'POST',
    `/repos/${repo}/git/commits`,
    {
      message: 'chore: rebuild dist so src-hash matches',
      tree: tree.sha,
      parents: [parentSha],
      author: {
        name: 'github-actions[bot]',
        email: '41898282+github-actions[bot]@users.noreply.github.com',
      },
    },
    fetchImpl,
  )
  await api(token, 'PATCH', refPath, { sha: commit.sha, force: false }, fetchImpl)
  const branchName = env('BRANCH', envSource)
  log(`Updated ${branchName} with ${commit.sha}`)
  return { updated: true, sha: commit.sha }
}

export async function main(options = {}) {
  try {
    return await runCommitDistTree(options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
    return undefined
  }
}

const invokedAsCli =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (invokedAsCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
