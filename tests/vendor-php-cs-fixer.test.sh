#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="${ROOT}/scripts/vendor-php-cs-fixer.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

tag="$(sed -n "s/.*DEFAULT_PHP_CS_FIXER_VERSION = '\\([^']*\\)'.*/\\1/p" "${ROOT}/src/inputs.ts" | head -n1)"
[[ -n "${tag}" ]] || fail "could not read DEFAULT_PHP_CS_FIXER_VERSION"
got="$(bash "${VENDOR}" --print-checksum "${tag}" "${ROOT}/checksums.txt")"
[[ "${#got}" -eq 64 ]] || fail "expected 64-char digest for ${tag}, got '${got}'"
grep -qiE "^${got}[[:space:]]+${tag}" "${ROOT}/checksums.txt" ||
  fail "digest '${got}' was not listed for ${tag} in checksums.txt"

printf '%s\n' \
  '# comment' \
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  v9.9.9' \
  $'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  v8.8.8\r' \
  >"${TMP}/checksums.txt"

got="$(bash "${VENDOR}" --print-checksum v9.9.9 "${TMP}/checksums.txt")"
[[ "${got}" == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" ]] ||
  fail "expected LF digest, got '${got}'"

got="$(bash "${VENDOR}" --print-checksum v8.8.8 "${TMP}/checksums.txt")"
[[ "${got}" == "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" ]] ||
  fail "expected CRLF digest, got '${got}'"

if bash "${VENDOR}" --print-checksum v0.0.0 "${TMP}/checksums.txt" >/dev/null 2>"${TMP}/err"; then
  fail "missing tag should fail"
fi
grep -q 'No SHA-256 checksum for php-cs-fixer v0.0.0' "${TMP}/err" ||
  fail "missing tag should mention the version"

echo "ok: vendor-php-cs-fixer checksum lookup"
