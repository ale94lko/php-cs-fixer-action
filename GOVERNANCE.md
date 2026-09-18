# Governance

This document describes how [php-cs-fixer-action](https://github.com/ale94lko/php-cs-fixer-action) makes decisions and who holds which roles.

## Model

The project uses a **maintainer-led** model on GitHub:

- Day-to-day work happens through issues and pull requests.
- Changes land on `main` only after review (see [`.github/CODEOWNERS`](.github/CODEOWNERS)).
- Releases are git tags (`vX.Y.Z`) that trigger [`.github/workflows/release.yml`](.github/workflows/release.yml).

There is no separate foundation board. Technical and security decisions are made by the maintainers listed below, with community input via issues and PRs.

## Roles and responsibilities

| Role | Who | Responsibilities |
| --- | --- | --- |
| **Maintainer** | [@ale94lko](https://github.com/ale94lko), [@leoflavio1989](https://github.com/leoflavio1989) | Triage issues/PRs, approve merges to `main`, cut releases, respond to security reports, keep CI and Scorecard healthy |
| **Contributor** | Anyone with a merged PR or substantive issue | Propose changes that follow [CONTRIBUTING.md](CONTRIBUTING.md), add tests for new behavior, respect the [Code of Conduct](.github/CODE_OF_CONDUCT.md) |
| **Security contact** | Maintainers (see [SECURITY.md](SECURITY.md)) | Receive private reports, coordinate disclosure, publish advisories when needed |

Code ownership for review requests is defined in [`.github/CODEOWNERS`](.github/CODEOWNERS) (`@ale94lko` and `@leoflavio1989`).

## Access continuity

At least **two** maintainers have GitHub admin (or equivalent) access to this repository, including the ability to:

- open and close issues,
- merge pull requests,
- push version tags / publish releases,
- manage GitHub Security Advisories and workflow secrets.

If one maintainer becomes unavailable, the other can continue those tasks within a week of confirmation. Repository settings, Dependabot, and Actions workflows do not depend on a single personal machine.

## Bus factor

The bus factor is **2** (both CODEOWNERS maintainers). See also [access continuity](#access-continuity).

## Unassociated contributors

Significant contributors [@ale94lko](https://github.com/ale94lko) and [@leoflavio1989](https://github.com/leoflavio1989) are **unassociated**: they are independent individuals (not the same employer/organization controlling both accounts). Both appear in [`.github/CODEOWNERS`](.github/CODEOWNERS) and can review and merge.

## Two-factor authentication (2FA)

Anyone with permission to push to this repository, merge to `main`, publish releases, or access private vulnerability reports **MUST** enable GitHub two-factor authentication on their account.

- **Required:** GitHub account 2FA enabled ([GitHub 2FA docs](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa)).
- **Preferred (secure 2FA):** TOTP authenticator app and/or security keys / passkeys — not SMS-only 2FA.

Maintainers confirm 2FA is enabled before receiving admin or Security Advisories access.

## Developer Certificate of Origin (DCO)

Non-trivial contributions should include a `Signed-off-by` line in each commit, asserting the [Developer Certificate of Origin](https://developercertificate.org/). See [CONTRIBUTING.md](CONTRIBUTING.md#developer-certificate-of-origin-dco).

## Related docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute and coding standards
- [SECURITY.md](SECURITY.md) — vulnerability reporting and response
- [docs/roadmap.md](docs/roadmap.md) — near-term plans
- [docs/architecture.md](docs/architecture.md) — high-level design
- [docs/assurance-case.md](docs/assurance-case.md) — security assurance case
