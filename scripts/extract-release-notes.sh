#!/usr/bin/env bash
# Extract GitHub Release notes from CHANGELOG.md.
# Prefers "Changelog for $TAG" when that section has entries; otherwise
# uses "Changelog for next".
# Usage: TAG=v1.0.4 bash scripts/extract-release-notes.sh
# Env: CHANGELOG (default CHANGELOG.md), NOTES_FILE (default release-notes.md)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TAG="${TAG:-}"
CHANGELOG="${CHANGELOG:-CHANGELOG.md}"
NOTES_FILE="${NOTES_FILE:-release-notes.md}"

if [[ ! "${TAG}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected TAG=vX.Y.Z, got '${TAG}'" >&2
  exit 1
fi

if [[ "${CHANGELOG}" != /* ]]; then
  CHANGELOG="${ROOT_DIR}/${CHANGELOG}"
fi

if [[ ! -f "${CHANGELOG}" ]]; then
  echo "Missing ${CHANGELOG}" >&2
  exit 1
fi

if [[ "${NOTES_FILE}" != /* ]]; then
  NOTES_FILE="${ROOT_DIR}/${NOTES_FILE}"
fi

NOTES="$(
  TAG="${TAG}" awk '
    BEGIN { tag = ENVIRON["TAG"] }
    function trim(s) {
      gsub(/\r/, "", s)
      gsub(/^[ \t\n]+|[ \t\n]+$/, "", s)
      return s
    }
    function save() {
      sections[section] = body
    }
    /^Changelog for / {
      if (in_section) save()
      section = $0
      sub(/^Changelog for /, "", section)
      gsub(/\r$/, "", section)
      in_section = 1
      skip = 1
      body = ""
      next
    }
    skip && /^-{3,}$/ { skip = 0; next }
    in_section { body = body $0 "\n" }
    END {
      if (in_section) save()
      notes = trim(sections[tag])
      if (notes == "") notes = trim(sections["next"])
      if (notes == "") {
        printf("No changelog notes for %s: fill Changelog for next or Changelog for %s.\n", tag, tag) > "/dev/stderr"
        exit 1
      }
      printf "%s\n", notes
    }
  ' "${CHANGELOG}"
)"

printf '%s\n' "${NOTES}" >"${NOTES_FILE}"
echo "Wrote release notes to ${NOTES_FILE}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    printf 'notes_file=%s\n' "${NOTES_FILE}"
    printf 'major=%s\n' "${TAG%%.*}"
  } >>"${GITHUB_OUTPUT}"
fi
