#!/usr/bin/env bash
# Force-update the floating major tag (v1) so uses: ...@v1 tracks this release.
# Usage: TAG=v1.0.4 bash scripts/update-major-tag.sh
set -euo pipefail

TAG="${TAG:-}"
if [[ ! "${TAG}" =~ ^v([0-9]+)\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected TAG=vX.Y.Z, got '${TAG}'" >&2
  exit 1
fi

major="v${BASH_REMATCH[1]}"
target="$(git rev-parse "${TAG}^{commit}")"
git tag --force "${major}" "${target}"
git push origin "refs/tags/${major}" --force
echo "Pointed ${major} at ${TAG} (${target})"
