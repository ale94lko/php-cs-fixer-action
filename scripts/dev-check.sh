#!/usr/bin/env bash
# Copyright (c) php-cs-fixer-action contributors
# SPDX-License-Identifier: MIT

# One-command local verification from a clean clone (Node 24+ and PHP 8.3+).
# Installs deps, runs the Vitest coverage gate, then runs the Action against
# the fixture config via scripts/ci-local.sh.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

npm ci
npm run test:coverage
bash "${ROOT_DIR}/scripts/ci-local.sh"

echo "ok: local check passed (coverage + fixture fixer run)"
