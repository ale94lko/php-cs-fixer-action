#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:?CONFIG_FILE is required}"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "::error::Resolved config '${CONFIG_FILE}' does not exist."
  exit 1
fi

set +e
./php-cs-fixer fix \
  --config="${CONFIG_FILE}" \
  --verbose \
  --diff \
  --show-progress=none \
  --allow-risky=yes \
  --dry-run \
  --format=txt \
  2>&1 | tee ./result.txt
exit_code=${PIPESTATUS[0]}
set -e

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "result<<PHP_CS_FIXER_EOF"
    cat ./result.txt
    echo "PHP_CS_FIXER_EOF"
  } >> "${GITHUB_OUTPUT}"
fi

if [[ "${exit_code}" -ne 0 ]]; then
  echo "::error::PHP CS Fixer found coding standard violations. See the detailed report above for files, fixers and diffs."
  exit "${exit_code}"
fi
