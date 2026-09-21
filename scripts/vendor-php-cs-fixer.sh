#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

# Download php-cs-fixer.phar, verify SHA-256 from checksums.txt, install to DEST.
# Usage:
#   bash scripts/vendor-php-cs-fixer.sh [tag] [dest] [checksums.txt]
#   bash scripts/vendor-php-cs-fixer.sh --print-checksum [tag] [checksums.txt]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# mawk (Debian/Ubuntu awk) does not implement {n} interval expressions.
expected_checksum() {
  local version="$1" checksums="$2"
  awk -v tag="${version}" '
    {
      sub(/\r$/, "")
      if ($2 == tag && length($1) == 64 && $1 ~ /^[a-fA-F0-9]+$/) {
        print tolower($1)
        exit
      }
    }
  ' "${checksums}"
}

if [[ "${1:-}" == "--print-checksum" ]]; then
  VERSION="${2:-v3.95.26}"
  CHECKSUMS="${3:-${ROOT_DIR}/checksums.txt}"
  if [[ ! -f "${CHECKSUMS}" ]]; then
    echo "checksums.txt not found: ${CHECKSUMS}" >&2
    exit 1
  fi
  EXPECTED="$(expected_checksum "${VERSION}" "${CHECKSUMS}")"
  if [[ -z "${EXPECTED}" ]]; then
    echo "No SHA-256 checksum for php-cs-fixer ${VERSION} in ${CHECKSUMS}" >&2
    exit 1
  fi
  printf '%s\n' "${EXPECTED}"
  exit 0
fi

VERSION="${1:-v3.95.26}"
DEST="${2:-/opt/php-cs-fixer/php-cs-fixer}"
CHECKSUMS="${3:-${ROOT_DIR}/checksums.txt}"
URL="https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${VERSION}/php-cs-fixer.phar"

if [[ ! -f "${CHECKSUMS}" ]]; then
  echo "checksums.txt not found: ${CHECKSUMS}" >&2
  exit 1
fi

EXPECTED="$(expected_checksum "${VERSION}" "${CHECKSUMS}")"
if [[ -z "${EXPECTED}" ]]; then
  echo "No SHA-256 checksum for php-cs-fixer ${VERSION} in ${CHECKSUMS}" >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT
curl -fsSL "${URL}" -o "${TMP}"

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL="$(sha256sum "${TMP}" | awk '{ print $1 }')"
else
  ACTUAL="$(shasum -a 256 "${TMP}" | awk '{ print $1 }')"
fi

if [[ "${ACTUAL}" != "${EXPECTED}" ]]; then
  echo "Checksum mismatch for php-cs-fixer ${VERSION}. Expected ${EXPECTED}, got ${ACTUAL}." >&2
  exit 1
fi

mkdir -p "$(dirname "${DEST}")"
cp "${TMP}" "${DEST}"
chmod +x "${DEST}"
echo "Vendored php-cs-fixer ${VERSION} -> ${DEST}"
