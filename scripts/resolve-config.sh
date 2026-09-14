#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=validate-inputs.sh
source "${SCRIPT_DIR}/validate-inputs.sh"

validate_use_full_rules "${USE_FULL_RULES:?USE_FULL_RULES is required}"
validate_git_ref "${RULES_VERSION:?RULES_VERSION is required}"
validate_config_path "${CONFIG_PATH-}"

if [[ -n "${CONFIG_PATH:-}" ]]; then
  if [[ ! -f "${CONFIG_PATH}" ]]; then
    echo "::error::config-path '${CONFIG_PATH}' was not found in the repository workspace."
    exit 1
  fi
  echo "Using local config: ${CONFIG_PATH}"
  echo "config=${CONFIG_PATH}" >> "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
  exit 0
fi

if [[ "${USE_FULL_RULES}" == "true" ]]; then
  rules_file=".php-cs-fixer.dist.php"
else
  rules_file=".php-cs-fixer.dist.min.php"
fi

download_url="https://raw.githubusercontent.com/ale94lko/php-cs-fixer-rules/${RULES_VERSION}/${rules_file}"
echo "Downloading rules from ${download_url}"
curl --fail --retry 3 --retry-delay 2 -L "${download_url}" -o .php-cs-fixer.dist.php

echo "config=.php-cs-fixer.dist.php" >> "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
