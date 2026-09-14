#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=validate-inputs.sh
source "${SCRIPT_DIR}/validate-inputs.sh"

validate_php_cs_fixer_version "${PHP_CS_FIXER_VERSION:?PHP_CS_FIXER_VERSION is required}"

echo "Downloading php-cs-fixer ${PHP_CS_FIXER_VERSION}"
curl --fail --retry 3 --retry-delay 2 -L \
  "https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases/download/${PHP_CS_FIXER_VERSION}/php-cs-fixer.phar" \
  -o php-cs-fixer
chmod a+x php-cs-fixer
