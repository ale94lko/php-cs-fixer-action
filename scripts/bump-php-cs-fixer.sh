#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

# Bump the default php-cs-fixer tag together with checksums.txt.
# Usage: bash scripts/bump-php-cs-fixer.sh [tag]
# Omit tag to use the latest GitHub Release of PHP-CS-Fixer/PHP-CS-Fixer.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

set_output() {
  local key="$1" value="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "${key}" "${value}" >>"${GITHUB_OUTPUT}"
  fi
}

current_default() {
  sed -n "s/.*DEFAULT_PHP_CS_FIXER_VERSION = '\\([^']*\\)'.*/\\1/p" src/inputs.ts | head -n1
}

latest_release_tag() {
  local url="https://api.github.com/repos/PHP-CS-Fixer/PHP-CS-Fixer/releases/latest"
  local args=(-fsSL -H "Accept: application/vnd.github+json")
  local payload tag
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  # Write the JSON to a file first. Piping curl into an interpreter is
  # Scorecard Pinned-Dependencies downloadThenRun (latest tag cannot be hash-pinned).
  payload="$(mktemp)"
  curl "${args[@]}" -o "${payload}" "${url}"
  tag="$(node scripts/read-json-field.mjs "${payload}" tag_name)"
  rm -f "${payload}"
  printf '%s\n' "${tag}"
}

CURRENT="$(current_default)"
if [[ -z "${CURRENT}" ]]; then
  echo "Could not read DEFAULT_PHP_CS_FIXER_VERSION from src/inputs.ts" >&2
  exit 1
fi

TARGET="${1:-}"
if [[ -z "${TARGET}" ]]; then
  TARGET="$(latest_release_tag)"
fi

if [[ ! "${TARGET}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Unexpected php-cs-fixer tag '${TARGET}'. Expected vX.Y.Z." >&2
  exit 1
fi

if [[ "${TARGET}" == "${CURRENT}" ]]; then
  echo "Default php-cs-fixer is already ${CURRENT}"
  set_output changed false
  set_output tag "${CURRENT}"
  exit 0
fi

echo "Bumping default php-cs-fixer ${CURRENT} -> ${TARGET}"
bash scripts/update-checksums.sh "${TARGET}"

NEW_TAG="${TARGET}" OLD_TAG="${CURRENT}" node scripts/bump-php-cs-fixer-pins.mjs

set_output changed true
set_output tag "${TARGET}"
echo "Pinned default php-cs-fixer ${TARGET}"
