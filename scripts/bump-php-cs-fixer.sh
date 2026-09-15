#!/usr/bin/env bash
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
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    args+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  curl "${args[@]}" "${url}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"])'
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

NEW_TAG="${TARGET}" OLD_TAG="${CURRENT}" python3 - <<'PY'
import os
import pathlib
import re

old = os.environ["OLD_TAG"]
new = os.environ["NEW_TAG"]
root = pathlib.Path(".")

inputs = root / "src" / "inputs.ts"
text = inputs.read_text(encoding="utf-8")
updated, n = re.subn(
    r"(DEFAULT_PHP_CS_FIXER_VERSION = ')[^']+(')",
    rf"\g<1>{new}\2",
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"failed to patch src/inputs.ts ({n} replacements)")
inputs.write_text(updated, encoding="utf-8")

action = root / "action.yml"
text = action.read_text(encoding="utf-8")
updated, n = re.subn(
    r"(php-cs-fixer-version:\n(?:.*\n)*?    default: )'[^']+'",
    rf"\1'{new}'",
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"failed to patch action.yml ({n} replacements)")
action.write_text(updated, encoding="utf-8")

for rel in ("README.md", "docker-compose.yml", "CONTRIBUTING.md"):
    path = root / rel
    path.write_text(path.read_text(encoding="utf-8").replace(old, new), encoding="utf-8")
PY

set_output changed true
set_output tag "${TARGET}"
echo "Pinned default php-cs-fixer ${TARGET}"
