#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck disable=SC1091
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

export PHP_CS_FIXER_VERSION="${PHP_CS_FIXER_VERSION:-v3.95.21}"
export CONFIG_PATH="${CONFIG_PATH:-${CONFIG_FILE:-tests/fixtures/.php-cs-fixer.dist.php}}"
export CONFIG_FILE="${CONFIG_FILE:-${CONFIG_PATH}}"

node "${ROOT_DIR}/dist/index.js"
