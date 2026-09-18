# Hardening

Hardening mechanisms used so defects are less likely to become security issues.

| Mechanism | Where |
| --- | --- |
| Fail-closed phar integrity (SHA-256 allowlist) | `src/download-fixer.ts`, `checksums.txt` |
| Cache restore re-verify | `src/cache.ts` |
| Input allowlist (Ajv JSON Schema) | `src/validate.ts`, `action.inputs.schema.json` |
| TypeScript + ESLint in CI | `npm run typecheck`, `npm run lint` |
| CodeQL + Hadolint | `.github/workflows/codeql.yml`, CI Hadolint step |
| Pinned Actions SHAs | `.github/workflows/*` |
| Least-privilege permission docs | README Integrity and cache |
| No download-then-run of unsigned scripts | bump helpers use JSON parse / Node, not `curl \| sh` |

See also [assurance-case.md](assurance-case.md) and [security-review-2026.md](security-review-2026.md).
