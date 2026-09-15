#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/commit-dist-tree.py"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

PYTHON=python3
if ! "${PYTHON}" -c 'import urllib.request' >/dev/null 2>&1; then
  PYTHON=python
fi
"${PYTHON}" -c 'import urllib.request' >/dev/null 2>&1 || fail "python3 is required"

mkdir -p "${TMP}/bad"
printf '%s\n' 'webpackMissingModule' >"${TMP}/bad/index.js"
if DIST_DIR="${TMP}/bad" "${PYTHON}" "${SCRIPT}" >/dev/null 2>"${TMP}/err"; then
  fail "webpackMissingModule should fail before calling the API"
fi
grep -q 'webpackMissingModule' "${TMP}/err" || fail "expected webpackMissingModule error"

mkdir -p "${TMP}/empty"
if DIST_DIR="${TMP}/empty" "${PYTHON}" "${SCRIPT}" >/dev/null 2>"${TMP}/err-empty"; then
  fail "missing index.js should fail"
fi
grep -q 'Missing' "${TMP}/err-empty" || fail "expected missing index.js error"

echo "ok: commit-dist-tree rejects a bad dist artifact"
