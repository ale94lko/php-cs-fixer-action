#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=../scripts/validate-inputs.sh
source "${ROOT_DIR}/scripts/validate-inputs.sh"

failures=0

assert_ok() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "PASS  ${name}"
  else
    echo "FAIL  ${name}"
    failures=$((failures + 1))
  fi
}

assert_fail() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL  ${name} (expected failure)"
    failures=$((failures + 1))
  else
    echo "PASS  ${name}"
  fi
}

assert_ok "accepts a release tag" validate_php_cs_fixer_version "v3.95.21"
assert_fail "rejects a missing v prefix" validate_php_cs_fixer_version "3.95.21"
assert_fail "rejects a path-like version" validate_php_cs_fixer_version "v3.95.21/../../etc/passwd"

assert_ok "accepts true" validate_use_full_rules "true"
assert_ok "accepts false" validate_use_full_rules "false"
assert_fail "rejects yes" validate_use_full_rules "yes"

assert_ok "accepts main" validate_git_ref "main"
assert_ok "accepts a tag" validate_git_ref "v1.0.1"
assert_ok "accepts a sha" validate_git_ref "abc123def"
assert_fail "rejects shell metacharacters" validate_git_ref 'main;rm -rf /'
assert_fail "rejects empty ref" validate_git_ref ""

assert_ok "allows empty config-path" validate_config_path ""
assert_ok "allows a relative config" validate_config_path "tests/fixtures/.php-cs-fixer.dist.php"
assert_fail "rejects parent traversal" validate_config_path "../secrets.php"
assert_fail "rejects an absolute path" validate_config_path "/etc/passwd"

if [[ "${failures}" -ne 0 ]]; then
  echo "${failures} assertion(s) failed"
  exit 1
fi

echo "All input validation assertions passed"
