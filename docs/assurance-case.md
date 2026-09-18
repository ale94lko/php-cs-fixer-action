# Security assurance case

This document argues that the security expectations in [SECURITY.md](../SECURITY.md) are met for **php-cs-fixer-action**.

## Security requirements (what users can and cannot expect)

**Users can expect:**

- The Action downloads `php-cs-fixer.phar` only over HTTPS from GitHub Releases.
- Before execution, the phar SHA-256 must match a digest in this repository’s [`checksums.txt`](../checksums.txt) (fail-closed).
- Cache restores re-verify the digest before use.
- Action inputs are validated against a committed JSON Schema (Ajv).
- Default `mode: check` does not rewrite files; `mode: fix` only changes the checked-out workspace as documented.

**Users cannot expect:**

- Protection of the consumer’s broader CI secrets beyond normal Actions isolation.
- A guarantee that upstream PHP-CS-Fixer itself is free of defects (we pin and verify bytes; we do not audit the entire fixer).
- GPG-signed Action tags (distribution is HTTPS git tags; see Scorecard Signed-Releases accepted low).

## Threat model

| Threat | Mitigation |
| --- | --- |
| Tampered phar on the wire or on a compromised mirror | HTTPS to GitHub; SHA-256 allowlist in-repo; abort on mismatch |
| Stale or poisoned Actions cache | Re-verify digest after restore; fail closed |
| Unexpected Action inputs | Ajv allowlist validation against `action.inputs.schema.json` |
| Accidental code execution from `download-then-run` scripts | Bump scripts do not pipe remote content into an interpreter; phar runs only after verify |
| Privilege creep in workflows | Document least privilege (`contents: read`, optional `actions: write` for cache) |

## Trust boundaries

Documented in [architecture.md](architecture.md) and the [download integrity](../SECURITY.md#download-integrity-threat-model) section of SECURITY.md: consumer workflow ↔ Action ↔ GitHub Releases ↔ cache.

## Secure design principles applied

- **Fail closed** on integrity and validation errors.
- **Least privilege** guidance for consumer permissions.
- **Defense in depth**: transport security (HTTPS) plus content integrity (SHA-256 pins).
- **Economy of mechanism**: small surface (`src/`), no custom crypto protocol—Node TLS + SHA-256.
- **Complete mediation**: every downloaded phar path goes through verify before exec.

## Common implementation weaknesses countered

| Weakness class | How countered |
| --- | --- |
| Using components with known vulns | `npm audit` in CI; Dependabot; pinned Actions SHAs |
| Broken access control / confused deputy | No privilege elevation; runs as the job’s token |
| Injection via inputs | Schema validation; careful argument passing to PHP |
| Insecure deserialization / unsigned artifacts | Checksum allowlist; no HTTP-only hash fetch |
| Memory-unsafe native code in *this* repo | TypeScript/Node Action (no C/C++); upstream phar is third-party and pinned |

## Evidence

- Unit and integration tests under `src/**/*.test.ts` and `tests/integration/` (Vitest; statement coverage thresholds ≥ 80%).
- CodeQL and Hadolint on CI; OpenSSF Scorecard on `main`.
- OpenSSF Best Practices Passing badge: https://www.bestpractices.dev/projects/6296
