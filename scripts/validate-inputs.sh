#!/usr/bin/env bash
# Shared input validation for php-cs-fixer-action.
# Safe to source from tests; when executed directly, validates env vars and exits.

validate_php_cs_fixer_version() {
  local version="$1"
  if [[ ! "${version}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Invalid php-cs-fixer-version '${version}'. Expected a release tag like v3.95.21." >&2
    return 1
  fi
}

validate_use_full_rules() {
  local value="$1"
  if [[ "${value}" != "true" && "${value}" != "false" ]]; then
    echo "Invalid use-full-rules '${value}'. Expected true or false." >&2
    return 1
  fi
}

validate_git_ref() {
  local ref="$1"
  if [[ -z "${ref}" ]]; then
    echo "rules-version must not be empty." >&2
    return 1
  fi
  if [[ ! "${ref}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
    echo "Invalid rules-version '${ref}'. Use a tag, branch, or SHA." >&2
    return 1
  fi
}

validate_config_path() {
  local path="$1"
  if [[ -z "${path}" ]]; then
    return 0
  fi
  if [[ "${path}" == /* || "${path}" == *..* ]]; then
    echo "Invalid config-path '${path}'. Use a relative path inside the workspace." >&2
    return 1
  fi
}

validate_all_inputs() {
  validate_php_cs_fixer_version "${PHP_CS_FIXER_VERSION:?PHP_CS_FIXER_VERSION is required}"
  validate_use_full_rules "${USE_FULL_RULES:?USE_FULL_RULES is required}"
  validate_git_ref "${RULES_VERSION:?RULES_VERSION is required}"
  validate_config_path "${CONFIG_PATH-}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
  validate_all_inputs
fi
