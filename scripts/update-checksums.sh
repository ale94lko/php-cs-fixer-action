#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v3.95.21}"
URL="https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${VERSION}/php-cs-fixer.phar"
CHECKSUMS="${ROOT_DIR}/checksums.txt"
TMP="$(mktemp)"
OUT="$(mktemp)"
trap 'rm -f "${TMP}" "${OUT}"' EXIT

curl -fsSL "${URL}" -o "${TMP}"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="$(sha256sum "${TMP}" | awk '{ print $1 }')"
else
  HASH="$(shasum -a 256 "${TMP}" | awk '{ print $1 }')"
fi

replaced=0
while IFS= read -r line || [[ -n "${line}" ]]; do
  tag="${line##* }"
  digest="${line%% *}"
  if [[ "${tag}" == "${VERSION}" && "${digest}" =~ ^[a-fA-F0-9]{64}$ ]]; then
    printf '%s  %s\n' "${HASH}" "${VERSION}" >>"${OUT}"
    replaced=1
  else
    printf '%s\n' "${line}" >>"${OUT}"
  fi
done <"${CHECKSUMS}"

if [[ "${replaced}" -eq 0 ]]; then
  printf '%s  %s\n' "${HASH}" "${VERSION}" >>"${OUT}"
fi

mv "${OUT}" "${CHECKSUMS}"
trap 'rm -f "${TMP}"' EXIT

echo "Pinned ${VERSION} -> ${HASH}"
