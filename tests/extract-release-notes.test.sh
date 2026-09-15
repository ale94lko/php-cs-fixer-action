#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTRACT="${ROOT}/scripts/extract-release-notes.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "ok: $*"
}

run_extract() {
  local changelog="$1" tag="$2" notes="$3"
  NOTES_FILE="${notes}" CHANGELOG="${changelog}" TAG="${tag}" bash "${EXTRACT}"
}

cat >"${TMP}/next.md" <<'EOF'
CHANGELOG for PHP CS Fixer Action
==========================

Changelog for next
------------------

* feature: From next. [#29](https://example)

Changelog for v1.0.2
--------------------

* feature: Old.
EOF

run_extract "${TMP}/next.md" v1.0.4 "${TMP}/from-next.md"
grep -Fqx '* feature: From next. [#29](https://example)' "${TMP}/from-next.md" || fail "expected next section"
if grep -q 'Old' "${TMP}/from-next.md"; then
  fail "must not include previous version section"
fi
pass "uses Changelog for next when the version section is missing"

cat >"${TMP}/version.md" <<'EOF'
CHANGELOG for PHP CS Fixer Action
==========================

Changelog for next
------------------

* feature: Unreleased leftover.

Changelog for v1.0.4
--------------------

* feature: Already moved.

Changelog for v1.0.2
--------------------

* feature: Old.
EOF

run_extract "${TMP}/version.md" v1.0.4 "${TMP}/from-version.md"
grep -Fqx '* feature: Already moved.' "${TMP}/from-version.md" || fail "expected version section"
if grep -q 'Unreleased leftover' "${TMP}/from-version.md"; then
  fail "must prefer Changelog for vX.Y.Z over next"
fi
pass "prefers Changelog for vX.Y.Z when that section has entries"

cat >"${TMP}/empty-in.md" <<'EOF'
CHANGELOG for PHP CS Fixer Action
==========================

Changelog for next
------------------

Changelog for v1.0.2
--------------------

* feature: Old.
EOF

if NOTES_FILE="${TMP}/empty.md" CHANGELOG="${TMP}/empty-in.md" TAG=v1.0.4 bash "${EXTRACT}" 2>"${TMP}/empty.err"; then
  fail "empty next and missing version section must fail"
fi
grep -q "No changelog notes" "${TMP}/empty.err" || fail "expected empty-notes error"
pass "fails when next and version sections are empty"

if NOTES_FILE="${TMP}/bad.md" CHANGELOG="${TMP}/next.md" TAG=v1.0.4-rc.1 bash "${EXTRACT}" 2>"${TMP}/bad.err"; then
  fail "pre-release tags must fail"
fi
grep -q "Expected TAG=vX.Y.Z" "${TMP}/bad.err" || fail "expected tag-format error"
pass "rejects tags that are not vX.Y.Z"

echo "All extract-release-notes tests passed"
