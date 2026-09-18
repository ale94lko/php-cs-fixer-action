#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/commit-dist-tree.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "node is required"

mkdir -p "${TMP}/bad"
printf '%s\n' 'webpackMissingModule' >"${TMP}/bad/index.js"
if DIST_DIR="${TMP}/bad" node "${SCRIPT}" >/dev/null 2>"${TMP}/err"; then
  fail "webpackMissingModule should fail before calling the API"
fi
grep -q 'webpackMissingModule' "${TMP}/err" || fail "expected webpackMissingModule error"

mkdir -p "${TMP}/empty"
if DIST_DIR="${TMP}/empty" node "${SCRIPT}" >/dev/null 2>"${TMP}/err-empty"; then
  fail "missing index.js should fail"
fi
grep -q 'Missing' "${TMP}/err-empty" || fail "expected missing index.js error"

echo "ok: commit-dist-tree rejects a bad dist artifact"
