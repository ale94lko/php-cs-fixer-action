# Contributing to php-cs-fixer-action

Thanks for helping improve this GitHub Action. Please also read the [Code of Conduct](.github/CODE_OF_CONDUCT.md) and [GOVERNANCE.md](GOVERNANCE.md).

## Development setup (quick start for contributors)

Requires **Node.js 24+** and **PHP 8.3+** on your PATH. From a clean clone, the one-command local check is:

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
bash scripts/dev-check.sh
```

`scripts/dev-check.sh` creates `.env` from `.env.example` when missing, then runs `npm ci`, `npm run test:coverage`, and `bash scripts/ci-local.sh` (Action entrypoint on the fixture config). A green run is the done-condition for local verification before you open a PR. Consumers who only *use* the Action should follow the [README Setup](README.md#setup) section instead.

Do **not** set `PHP_CS_FIXER_IGNORE_ENV` in `.env` or CI — it is deprecated upstream and will be removed in php-cs-fixer 4.0. The fixture config uses `setUnsupportedPhpVersionAllowed(true)`; see [README — Unsupported PHP versions](README.md#unsupported-php-versions).

Optional longer setup (lint/typecheck/build) when you are changing `src/`:

```bash
cp .env.example .env
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

From a fresh clone, audit the production lockfile (the packages ncc ships in `dist/`). There is no `composer.json`; php-cs-fixer is a GitHub-release phar (downloaded and checksum-verified, or pointed at via `PHP_CS_FIXER_PHAR`).

```bash
npm ci
npm audit --omit=dev --audit-level=high
```

CI fails that job on high or critical advisories. Do not waive those without an explicit, reviewed exception.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run audit:prod
shfmt -d -i 2 scripts tests/*.sh
actionlint
bash tests/extract-release-notes.test.sh
bash tests/vendor-php-cs-fixer.test.sh
bash tests/bump-php-cs-fixer.test.sh
bash tests/commit-dist-tree.test.sh
```

Format shell scripts with `shfmt -w -i 2 scripts tests/*.sh` (CI runs `shfmt -d -i 2` on `scripts/` and `tests/*.sh`). `.editorconfig` sets UTF-8, LF, and trim-whitespace so Windows checkouts do not drift.

Lint workflows with [`actionlint`](https://github.com/rhysd/actionlint) (`actionlint` from the repo root, or `actionlint -color`). It checks `.github/workflows/` only; composite `action.yml` is not supported. CI pins [v1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12). Install locally from the [actionlint README](https://github.com/rhysd/actionlint#installation). When `shellcheck` is on `PATH`, actionlint also lints `run:` scripts.

Every `uses:` in `.github/workflows/` is pinned to a 40-character commit SHA with a version comment (for example `actions/checkout@3d3c42e5… # v7.0.1`). Do not switch those back to mutable tags (`@v7`, `@main`). Dependabot's `github-actions` ecosystem still opens weekly PRs because it reads the version comment. `uses: ./` in CI is the local Action and stays unpinned. Consumer examples under `examples/` use the floating major tag (`@v1`); document patch pins (`@v1.1.0`) only when a frozen release is required.

After changing `src/` or lockfile dependencies, commit the rebuilt `dist/` in the same change when you can. Same-repo PRs that touch `package.json`, `package-lock.json`, `src/`, or `scripts/` get `dist/` rebuilt automatically: `Rebuild dist` runs on `pull_request` (read-only, checks out the PR, uploads an artifact) and `Commit rebuilt dist` runs on `workflow_run` (write token, default-branch checkout only, Git Data API). Scorecard **Token-Permissions** still warns on that job-level `contents: write` ([#65](https://github.com/ale94lko/php-cs-fixer-action/issues/65), [#54](https://github.com/ale94lko/php-cs-fixer-action/issues/54)); GitHub has no narrower scope than `contents: write` for creating commits. Fork PRs still need a local `npm run build`. Do not check out `pull_request.head` or `workflow_run.head_sha` in the privileged job — that is the Scorecard **Dangerous-Workflow** pattern ([#63](https://github.com/ale94lko/php-cs-fixer-action/issues/63)). Do not merge if `Rebuild dist` fails (`ncc` cannot bundle ESM-only `@actions/cache` 5+/6+ or `@actions/core` 2+/3+). CI checks a `src-hash` banner in `dist/index.js` instead of a byte-for-byte ncc diff, because Windows and Linux ncc output is not identical. Keep `@actions/cache` on `^4.1.0` and `@actions/core` on `^1.11.1` (see [`docs/dependency-notes.md`](docs/dependency-notes.md) for overrides and the `webpackMissingModule` guard). `dist/` is marked generated and ignored in `.github/codeql/codeql-config.yml` so CodeQL scans `src/` rather than the ncc vendor bundle. CodeQL runs on push/PR to `main` and weekly (`.github/workflows/codeql.yml`). OpenSSF Scorecard runs on `main` and weekly (`.github/workflows/scorecard.yml`), not on pull requests: `publish_results` only publishes `supply-chain/branch-protection` and `supply-chain/online-scm` on the default branch, and a PR SARIF upload makes the "Code scanning results / Scorecard" check fail with "2 configurations not found". Add the README badge only after a successful run on `main`.

When bumping the default `php-cs-fixer-version`, keep `checksums.txt` in the same change:

```bash
bash scripts/update-checksums.sh v3.95.26
```

When bumping the default `rules-version`, keep `rules-checksums.txt` in the same change:

```bash
bash scripts/update-rules-checksums.sh v1.0.1
```

A weekly workflow (`bump-php-cs-fixer.yml`) opens that PR automatically (`bash scripts/bump-php-cs-fixer.sh`, then `npm run build`). It uses top-level `permissions: {}` and grants `contents: write` plus `pull-requests: write` only on the `bump` job. Scorecard **Token-Permissions** still warns on that job-level write ([#73](https://github.com/ale94lko/php-cs-fixer-action/issues/73)); GitHub has no narrower scope for pushing a branch and opening a PR.

Keep changes small: one fix or feature per commit/PR, including the tests that pin the new behavior (see [Commits and tests](#commits-and-tests)).

## Project docs

- [GOVERNANCE.md](GOVERNANCE.md) — decision model, roles, access continuity, DCO, 2FA
- [docs/roadmap.md](docs/roadmap.md) — next-year plans
- [docs/architecture.md](docs/architecture.md) — high-level design
- [docs/assurance-case.md](docs/assurance-case.md) — security assurance case
- [docs/hardening.md](docs/hardening.md) — hardening mechanisms
- [docs/security-review-2026.md](docs/security-review-2026.md) — security review record
- [docs/code-review.md](docs/code-review.md) — review requirements
- [docs/small-tasks.md](docs/small-tasks.md) — starter tasks for new contributors
- [docs/achievements.md](docs/achievements.md) — public badges and recognition
- [SECURITY.md](SECURITY.md) — vulnerability reporting and response
- [docs/dependency-notes.md](docs/dependency-notes.md) — npm / Actions pins

## OpenSSF Scorecard

[`.github/workflows/scorecard.yml`](.github/workflows/scorecard.yml) runs on `main`, weekly, and `branch_protection_rule`. It does not run on pull requests (`publish_results` only emits `supply-chain/branch-protection` and `supply-chain/online-scm` on the default branch). Add the README badge only after a successful run on `main`.

These checks are **accepted low scores**, not a regression of the Scorecard workflow ([#53](https://github.com/ale94lko/php-cs-fixer-action/issues/53)):

- **Fuzzing** — this Action is not a parser or network service. Do not add OSS-Fuzz unless that surface appears ([#71](https://github.com/ale94lko/php-cs-fixer-action/issues/71)).
- **Signed-Releases** — consumers pin git tags (`@v1` / `@v1.1.0`), not signed npm/provenance artifacts.
- **CII-Best-Practices** — Passing badge achieved ([project 6296](https://www.bestpractices.dev/projects/6296)); Silver docs are in `GOVERNANCE.md` and `docs/`. Scorecard should report 10 for Passing after the next run on `main` ([#67](https://github.com/ale94lko/php-cs-fixer-action/issues/67)).
- **Branch-Protection (full score)** — without `SCORECARD_TOKEN` (a PAT that can read admin protection settings) Scorecard cannot see every rule on a public repo. Leave `repo_token` commented in `scorecard.yml` unless we add that secret.

**Dangerous-Workflow** is not in that set: `rebuild-dist.yml` no longer uses `pull_request_target`. Dist rebuild is an unprivileged `pull_request` job plus a `workflow_run` Git Data API commit ([#63](https://github.com/ale94lko/php-cs-fixer-action/issues/63)). Do not check out `pull_request.head` or `workflow_run.head_sha` in the privileged job.

**Token-Permissions** workflow roots are `permissions: {}`, `contents: read`, or `read-all`. Write is only on the jobs that need it: `actions: write` for php-cs-fixer cache in CI ([#62](https://github.com/ale94lko/php-cs-fixer-action/issues/62)), `contents: write` for release / badge / bump / dist commit ([#65](https://github.com/ale94lko/php-cs-fixer-action/issues/65), [#72](https://github.com/ale94lko/php-cs-fixer-action/issues/72), [#73](https://github.com/ale94lko/php-cs-fixer-action/issues/73), [#61](https://github.com/ale94lko/php-cs-fixer-action/issues/61)). Scorecard still **warns** on those job-level writes (it only ignores semantic-release / goreleaser / Maven). Do not raise write back to the workflow root ([#54](https://github.com/ale94lko/php-cs-fixer-action/issues/54)).

**SAST** — CodeQL already runs on every `push` and `pull_request` to `main` with no path filters ([#26](https://github.com/ale94lko/php-cs-fixer-action/issues/26)). Scorecard may report below 10 when a commit in its recent sample had no `github-code-scanning` check on the associated PR, or when only one SAST tool is configured (CodeQL). Do not push commits to `main` outside a pull request, and do not add `paths` filters to `codeql.yml`. A former second SAST tool tied to an image build was removed so project-type classifiers treat this as a GitHub Action ([#115](https://github.com/ale94lko/php-cs-fixer-action/issues/115), [#101](https://github.com/ale94lko/php-cs-fixer-action/issues/101)).

**CI-Tests** — [`ci.yml`](.github/workflows/ci.yml) already runs on every `push` and `pull_request` with no `paths` filters. Scorecard looks for a successful `github-actions` check on each merged PR HEAD ([docs](https://github.com/ossf/scorecard/blob/main/docs/checks.md#ci-tests)). The original 19/20 finding ([alert #36](https://github.com/ale94lko/php-cs-fixer-action/security/code-scanning/36), [#66](https://github.com/ale94lko/php-cs-fixer-action/issues/66)) was a historical sample; the latest Scorecard run on `main` is **26/26, score 10**. Required status checks are a GitHub branch-protection setting, not a workflow file (same limitation as Branch-Protection in [#53](https://github.com/ale94lko/php-cs-fixer-action/issues/53)). Do not add `paths` filters to `ci.yml`, and do not merge PRs that skipped CI.

**Code-Review** — Scorecard looks for a GitHub `APPROVED` review (or a merger other than the committer) on recent changesets ([docs](https://github.com/ossf/scorecard/blob/main/docs/checks.md#code-review)). Bot reviews do not count. Branch protection already requires a review; [`.github/CODEOWNERS`](.github/CODEOWNERS) names `@ale94lko` and `@leoflavio1989` so GitHub can request a maintainer. Enable **Require review from Code Owners** on `main` if it is not already on. Do not merge your own PR without that approval. The original 3/23 finding ([alert #34](https://github.com/ale94lko/php-cs-fixer-action/security/code-scanning/34), [#68](https://github.com/ale94lko/php-cs-fixer-action/issues/68)) is a historical sample (7/29, score 2 today). Dismissing the alert does not stick until every sampled human changeset has a review. Older history cannot be rewritten.

## Releasing

Notes always come from `CHANGELOG.md`. Prefer a filled `Changelog for vX.Y.Z` section; if that heading is missing or empty, the release workflow uses `Changelog for next`.

1. Make sure the section that should ship is non-empty (usually `Changelog for next`).
2. Merge the release commit to `main`.
3. Tag and push a stable version:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. [`.github/workflows/release.yml`](.github/workflows/release.yml) (top-level `permissions: {}`, job `contents: write`) creates or updates the GitHub Release from those notes and force-updates the floating major tag (`v1` for `v1.x.y`) to the same commit so `uses: ale94lko/php-cs-fixer-action@v1` tracks the latest compatible release. Scorecard reports that job-level write; GitHub has no narrower `releases` scope, and Scorecard only ignores `contents: write` for semantic-release / goreleaser / Maven.

The workflow does not rewrite `CHANGELOG.md`. After the tag, retitle `Changelog for next` to `Changelog for vX.Y.Z` and add an empty next section in a follow-up commit. Do not push an older `vX.Y.Z` than the current major tag; the major tag is force-updated.

## Local fixer

Run php-cs-fixer against the clean fixtures. Prefer the one-command path (`bash scripts/dev-check.sh`) when starting from a clean clone. Alone, `scripts/ci-local.sh` defaults to `tests/fixtures/.php-cs-fixer.dist.php` (no php-cs-fixer-rules). The first run without a verified `php-cs-fixer` binary or `PHP_CS_FIXER_PHAR` still needs network to download the phar:

```bash
bash scripts/ci-local.sh
```

CI jobs: `lint` (ESLint, ShellCheck, shfmt, actionlint, changelog release-notes tests), `audit` (`npm audit --omit=dev --audit-level=high`), `audit-outdated` (informational `npm outdated` artifact), `commitlint` (Conventional Commits on `pull_request` only), `typecheck`, `test` (Vitest + coverage thresholds, including `tests/integration/`), `check` on clean fixtures, `check` on a dirty fixture (must fail, with file-level annotations rather than a generic `::error::`), and `fix` on a dirty fixture (must rewrite the file). The dirty-fixture check job is expected to fail the Action step; the workflow only fails if that Action *does not* fail. Fixture Action jobs always set `config-path: tests/fixtures/.php-cs-fixer.dist.php`. Weekly `dep-freshness.yml` posts the same outdated report to the job summary.

Keep changes small: one fix or feature per commit/PR, including the tests that pin the new behavior.

## Coding standards

Primary languages are TypeScript/JavaScript and shell:

- **TypeScript / JavaScript** — ESLint flat config [`eslint.config.mjs`](eslint.config.mjs) (`npm run lint`). CI fails on lint errors.
- **Shell** — `shfmt -i 2` and ShellCheck (via actionlint when available).
- **Workflows** — `actionlint` on `.github/workflows/`.

Contributions must generally comply with these tools. Do not disable rules to hide new issues without maintainer review.

## Developer Certificate of Origin (DCO)

By contributing, you certify that you have the right to submit the work under the project license. Include a Signed-off-by line in each commit (see the [DCO](https://developercertificate.org/)):

```text
Signed-off-by: Your Name <you@example.com>
```

Example: `git commit -s -m "feat: …"`.

## Commits and tests

Use [Conventional Commits](https://www.conventionalcommits.org/) on every PR commit. Allowed types: `feat`, `fix`, `chore`, `test`, `docs`, `ci`, `refactor` (for example `feat: add paths input`, `fix: fail closed on checksum mismatch`). CI runs `commitlint` on `pull_request` only so historical `main` SHAs are not rewritten or re-linted.

**Formal test policy (required).** As major new functionality is added, tests for that functionality **MUST** be added to the automated suite (Vitest under `src/**/*.test.ts` or `tests/integration/`, or shell tests under `tests/`). Ship each feature or fix with the tests that pin the new behavior in the **same** focused commit or PR. One concern per commit/PR — do not mix unrelated formatting or refactors with the feature. Prefer regression tests when fixing bugs (target: at least half of bugs fixed in a six-month window). Do not rewrite old history to invent that pairing.

Statement coverage is enforced at **≥ 90%** statements/lines and **≥ 80%** branches via Vitest thresholds in [`vitest.config.ts`](vitest.config.ts) (`npm run test:coverage`).

## Workflow

1. Search [existing issues](https://github.com/ale94lko/php-cs-fixer-action/issues) before opening a new one.
2. Fork the repository and create a focused branch.
3. Add or update tests for the behavior you change.
4. Open a pull request and [link it to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
5. Enable [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).

## Code review

Branch protection and [`.github/CODEOWNERS`](.github/CODEOWNERS) require a maintainer review before merge. When a second human maintainer is available, prefer that they review and merge the PR (or at least leave the approving review) so authorship and merge credit diversify over time. Do not self-merge your own PR when another CODEOWNER can review. This complements the longer-term maintainer process in [#117](https://github.com/ale94lko/php-cs-fixer-action/issues/117); it does not replace it.

After a same-repo pull request is merged, GitHub deletes the head branch automatically (`Automatically delete head branches` is enabled on this repository). Fork PR branches are not deleted on the contributor's fork.

## Security reports

Please do not open public issues for vulnerabilities. Follow
[SECURITY.md](SECURITY.md) for private reporting and for the download →
checksum → cache trust boundary.
