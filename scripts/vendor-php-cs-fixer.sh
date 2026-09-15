#!/usr/bin/env bash
# Download php-cs-fixer.phar, verify SHA-256 from checksums.txt, install to DEST.
# Usage: bash scripts/vendor-php-cs-fixer.sh [tag] [dest] [checksums.txt]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v3.95.21}"
DEST="${2:-/opt/php-cs-fixer/php-cs-fixer}"
CHECKSUMS="${3:-${ROOT_DIR}/checksums.txt}"
URL="https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${VERSION}/php-cs-fixer.phar"

if [[ ! -f "${CHECKSUMS}" ]]; then
  echo "checksums.txt not found: ${CHECKSUMS}" >&2
  exit 1
fi

EXPECTED="$(awk -v tag="${VERSION}" '$2 == tag && $1 ~ /^[a-fA-F0-9]{64}$/ { print tolower($1); exit }' "${CHECKSUMS}")"
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
