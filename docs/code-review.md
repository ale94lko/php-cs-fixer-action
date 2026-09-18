# Code review standards

How proposed modifications are reviewed before they reach `main`.

## Who reviews

- [`.github/CODEOWNERS`](../.github/CODEOWNERS) requests review from `@ale94lko` and `@leoflavio1989`.
- Branch protection on `main` requires at least one approving review (prefer **Require review from Code Owners**).
- The author of a change must not be the sole approver of that change for release to `main`.

## What reviewers check

1. **Intent** — the PR solves a real issue or documented need; scope stays focused.
2. **Tests** — new behavior has Vitest/shell coverage; bug fixes include a regression where practical ([CONTRIBUTING](../CONTRIBUTING.md#commits-and-tests)).
3. **Security** — download/verify paths stay fail-closed; no secrets in logs; permissions stay least-privilege.
4. **Style** — ESLint / typecheck / shfmt / actionlint clean; Conventional Commits + DCO `Signed-off-by`.
5. **`dist/`** — if `src/` or lockfile changed, rebuilt `dist/` (or CI rebuild) matches `src-hash` policy.

## What is required to merge

- CI green on the PR (lint, typecheck, coverage thresholds, Action self-tests).
- At least one maintainer approval from someone other than the author when human review is required.
- Linked issue when fixing tracked work.

Bot-only approvals do not satisfy human review expectations for Scorecard Code-Review.
