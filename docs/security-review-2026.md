# Security review (2026)

Date: 2026-09-18  
Scope: php-cs-fixer-action (Node 24 TypeScript GitHub Action)  
Reviewers: project maintainers ([GOVERNANCE.md](../GOVERNANCE.md))

## Method

Maintainers reviewed the security requirements and trust boundaries documented in:

- [SECURITY.md](../SECURITY.md) (reporting, response, download integrity)
- [docs/assurance-case.md](assurance-case.md) (requirements, threat model, secure design, common weaknesses)
- [docs/architecture.md](architecture.md) (components and boundaries)

The review also considered current mitigations already enforced in CI: input schema validation (Ajv), SHA-256 fail-closed phar verify, CodeQL, `npm audit`, Dependabot, and Hadolint on the Dockerfile.

## Security boundary

| Inside the boundary | Outside |
| --- | --- |
| Action code in `src/` / `dist/`, `checksums.txt`, workflow permissions guidance | Consumer repo contents, GitHub runner OS, upstream PHP-CS-Fixer logic beyond pinned bytes |

## Findings

- No open medium-or-higher vulnerabilities known for this Action at review time.
- Integrity path (HTTPS + allowlisted digests + cache re-verify) matches the stated requirements.
- Residual risk: upstream fixer defects; mitigated by pinning and checksums, not by re-auditing PHP-CS-Fixer itself.

## Outcome

Security requirements for the current major line are accepted as met. Re-review when the download trust model changes (new artifact source, dropped checksums, or new network protocol) or within five years, whichever comes first.
