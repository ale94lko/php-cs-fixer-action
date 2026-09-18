#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v1.0.1}"
CHECKSUMS="${ROOT_DIR}/rules-checksums.txt"
TMP_DIR="$(mktemp -d)"
OUT="$(mktemp)"
trap 'rm -rf "${TMP_DIR}" "${OUT}"' EXIT

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file}" | awk '{ print $1 }'
  else
    shasum -a 256 "${file}" | awk '{ print $1 }'
  fi
}

upsert_line() {
  local hash="$1"
  local key="$2"
  local replaced=0
  : >"${OUT}"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ "${line}" =~ ^# ]] || [[ -z "${line}" ]]; then
      printf '%s\n' "${line}" >>"${OUT}"
      continue
    fi
    tag="${line##* }"
    digest="${line%% *}"
    if [[ "${tag}" == "${key}" && "${digest}" =~ ^[a-fA-F0-9]{64}$ ]]; then
      printf '%s  %s\n' "${hash}" "${key}" >>"${OUT}"
      replaced=1
    else
      printf '%s\n' "${line}" >>"${OUT}"
    fi
  done <"${CHECKSUMS}"
  if [[ "${replaced}" -eq 0 ]]; then
    printf '%s  %s\n' "${hash}" "${key}" >>"${OUT}"
  fi
  mv "${OUT}" "${CHECKSUMS}"
  OUT="$(mktemp)"
}

for file in .php-cs-fixer.dist.php .php-cs-fixer.dist.min.php; do
  url="https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/${VERSION}/${file}"
  dest="${TMP_DIR}/${file}"
  curl -fsSL "${url}" -o "${dest}"
  hash="$(hash_file "${dest}")"
  upsert_line "${hash}" "${VERSION}/${file}"
  echo "Pinned ${VERSION}/${file} -> ${hash}"
done
