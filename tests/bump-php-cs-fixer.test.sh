#!/usr/bin/env bash
# Scorecard Pinned-Dependencies flags piping curl into python (downloadThenRun).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/bump-php-cs-fixer.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

if grep -E 'curl[^\n]*\|[[:space:]]*python3' "${SCRIPT}"; then
  fail "scripts/bump-php-cs-fixer.sh must not pipe curl into python3"
fi
pattern="-o \"\${payload}\""
grep -Fq -- "${pattern}" "${SCRIPT}" ||
  fail "expected curl to write the GitHub API body to a file"
grep -Fq 'json.load(open(sys.argv[1]' "${SCRIPT}" ||
  fail "expected python3 to parse a file path, not stdin"

echo "ok: bump-php-cs-fixer does not download-then-run"
