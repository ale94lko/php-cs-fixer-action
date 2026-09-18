#!/usr/bin/env bash
# Scorecard Pinned-Dependencies flags piping curl into an interpreter (downloadThenRun).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/bump-php-cs-fixer.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

if grep -Eiq 'python3?|[[:space:]]python[[:space:]]' "${SCRIPT}"; then
  fail "scripts/bump-php-cs-fixer.sh must not invoke python"
fi
if grep -E 'curl[^\n]*\|[[:space:]]*(python3?|node)' "${SCRIPT}"; then
  fail "scripts/bump-php-cs-fixer.sh must not pipe curl into an interpreter"
fi
pattern="-o \"\${payload}\""
grep -Fq -- "${pattern}" "${SCRIPT}" ||
  fail "expected curl to write the GitHub API body to a file"
grep -Fq 'scripts/read-json-field.mjs' "${SCRIPT}" ||
  fail "expected node scripts/read-json-field.mjs to parse a file path, not stdin"
grep -Fq 'scripts/bump-php-cs-fixer-pins.mjs' "${SCRIPT}" ||
  fail "expected node scripts/bump-php-cs-fixer-pins.mjs for pin rewrites"

echo "ok: bump-php-cs-fixer does not download-then-run"
