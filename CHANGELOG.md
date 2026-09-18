CHANGELOG for PHP CS Fixer Action
==========================

This file contains changelogs for stable releases only.

Changelog for next
------------------

* docs: Embed the OpenSSF Best Practices Passing badge and note Scorecard CII is Passing ([project 6296](https://www.bestpractices.dev/projects/6296)).
* docs: Prefer GitHub Security Advisories for private vulnerability reports.
* docs: Require features/fixes to ship with tests in small focused Conventional Commits. [#93](https://github.com/ale94lko/php-cs-fixer-action/issues/93)
* chore: Replace Python maintenance helpers with Node scripts. [#106](https://github.com/ale94lko/php-cs-fixer-action/issues/106)
* docs: Document dependency overrides and Actions CJS pins. [#104](https://github.com/ale94lko/php-cs-fixer-action/issues/104)
* test: Add end-to-end integration coverage for the `run()` pipeline (check + fix). [#102](https://github.com/ale94lko/php-cs-fixer-action/issues/102)
* docs: Remove the Scope subsection from README. [#101](https://github.com/ale94lko/php-cs-fixer-action/issues/101)
* chore: Drop `docker-compose.yml` and `.devcontainer` (keep `Dockerfile` for offline CI / Hadolint). [#101](https://github.com/ale94lko/php-cs-fixer-action/issues/101)
* test: Add a loopback HTTP integration test for `downloadFixer` checksum verification and cache reuse. [#92](https://github.com/ale94lko/php-cs-fixer-action/issues/92)
* ci: Require Conventional Commits on PRs via commitlint (SHA-pinned). [#91](https://github.com/ale94lko/php-cs-fixer-action/issues/91)
* ci: Upload an informational `npm outdated` report in CI and add a weekly dependency-freshness workflow. [#90](https://github.com/ale94lko/php-cs-fixer-action/issues/90)
* docs: Add a Scope subsection stating this repo is a GitHub Action, not IaC. [#88](https://github.com/ale94lko/php-cs-fixer-action/issues/88)
* docs: Record Scorecard Code-Review policy and add CODEOWNERS so new PRs get a maintainer approval. [#68](https://github.com/ale94lko/php-cs-fixer-action/issues/68)
* docs: Record that Scorecard CI-Tests is 10 (26/26); keep CI on every PR with no path filters. [#66](https://github.com/ale94lko/php-cs-fixer-action/issues/66)
* ci: Lint the Dockerfile with Hadolint so Scorecard SAST is 10 and code-scanning alert #42 can close. [#64](https://github.com/ale94lko/php-cs-fixer-action/issues/64)
* docs: Record that GitHub Actions write tokens are scoped to jobs; remaining Scorecard Token-Permissions findings are job-level warnings. [#54](https://github.com/ale94lko/php-cs-fixer-action/issues/54)
* docs: Record which OpenSSF Scorecard checks are accepted low scores. [#53](https://github.com/ale94lko/php-cs-fixer-action/issues/53)
* feature: Validate Action inputs against committed `action.inputs.schema.json` with Ajv. [#37](https://github.com/ale94lko/php-cs-fixer-action/issues/37)
* fix: Stop piping the GitHub Releases API into python in `scripts/bump-php-cs-fixer.sh` so Scorecard no longer reports downloadThenRun. [#69](https://github.com/ale94lko/php-cs-fixer-action/issues/69)
* fix: Pin the Docker `FROM` image to `php:8.3-cli-bookworm@sha256:…` so Scorecard Pinned-Dependencies no longer flags an unhashed container base. [#70](https://github.com/ale94lko/php-cs-fixer-action/issues/70)
* fix: Drop workflow-level `actions: write` from `ci.yml` and grant it only on the Action self-test jobs that cache the php-cs-fixer phar. [#62](https://github.com/ale94lko/php-cs-fixer-action/issues/62)
* feature: Report Action failures through one helper (`step`, `code`, `message`) with optional `ERROR_TRACKING_URL` webhook. [#36](https://github.com/ale94lko/php-cs-fixer-action/issues/36)
* fix: Drop workflow-level write from `health_score.yml` and grant `contents: write` only on the badge job. [#72](https://github.com/ale94lko/php-cs-fixer-action/issues/72)
* fix: Drop workflow-level write from `bump-php-cs-fixer.yml` and grant `contents: write` plus `pull-requests: write` only on the `bump` job. [#73](https://github.com/ale94lko/php-cs-fixer-action/issues/73)
* chore: Run OpenSSF Scorecard on `main` / schedule only so PR code scanning does not fail with "2 configurations not found".
* fix: Split dist rebuild into an unprivileged `pull_request` build and a `workflow_run` Git Data API commit so Scorecard Dangerous-Workflow is not triggered. [#63](https://github.com/ale94lko/php-cs-fixer-action/issues/63)
* chore: Replace deprecated `moduleResolution: node` (`node10`) with `module: preserve` and `moduleResolution: bundler` so TypeScript 6/7 typecheck stays valid.
* feature: Vendor the pinned php-cs-fixer phar in the Docker image and lint fixtures offline (`docker run --network=none`). Local/CI fixture runs use `tests/fixtures/.php-cs-fixer.dist.php` so php-cs-fixer-rules is not required. [#35](https://github.com/ale94lko/php-cs-fixer-action/issues/35)
* chore: Run `npm audit --omit=dev --audit-level=high` on every push and pull request. [#34](https://github.com/ale94lko/php-cs-fixer-action/issues/34)
* chore: Rebuild committed `dist/` on same-repo PRs that change `src/` or the lockfile, not only Dependabot.
* chore: Pin GitHub Actions in `.github/workflows/` to commit SHAs with version comments so Dependabot can still bump them. [#30](https://github.com/ale94lko/php-cs-fixer-action/issues/30)
* feature: Publish GitHub Releases from `CHANGELOG.md` when a `vX.Y.Z` tag is pushed, and move the floating major tag (`v1`). [#29](https://github.com/ale94lko/php-cs-fixer-action/issues/29)
* chore: Lint GitHub Actions workflows with actionlint in CI. [#28](https://github.com/ale94lko/php-cs-fixer-action/issues/28)
* feature: Add OpenSSF Scorecard on `main` / weekly and upload SARIF to code scanning. [#27](https://github.com/ale94lko/php-cs-fixer-action/issues/27)
* feature: Add CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows. [#26](https://github.com/ale94lko/php-cs-fixer-action/issues/26)
* chore: Add EditorConfig and fail CI when shell scripts are not `shfmt`-clean. [#20](https://github.com/ale94lko/php-cs-fixer-action/issues/20)
* feature: Verify php-cs-fixer.phar with a committed SHA-256 in `checksums.txt` and cache it across CI runs (`@actions/cache`, keyed by version + hash). Weekly workflow opens a PR that bumps the default tag and checksum together. [#17](https://github.com/ale94lko/php-cs-fixer-action/issues/17)
* chore: Rebuild committed `dist/` on Dependabot PRs and ignore ESM majors of `@actions/core` and `@actions/cache`.
* fix: Keep `@actions/cache` on 4.1.0 (CJS) because ncc cannot bundle the ESM-only 5+/6+ packages, and override transitive `uuid` to 11.1.1.
* fix: Mark `dist/` as generated for CodeQL and escape backslashes in job-summary table cells.
* feature: Emit file-level GitHub annotations and a job-summary table from the php-cs-fixer JSON report, and fail style checks without a generic `::error::`. [#16](https://github.com/ale94lko/php-cs-fixer-action/issues/16)
* feature: Add `mode` (`check` by default, or `fix`) and optional `paths` inputs so consumers can apply fixes or limit the run without wrapping the Action. [#15](https://github.com/ale94lko/php-cs-fixer-action/issues/15)
* feature: Rewrite the Action as a Node 24 TypeScript entrypoint (`dist/index.js`) with ESLint, `tsc`, and Vitest coverage in CI. Public inputs/outputs stay the same. [#19](https://github.com/ale94lko/php-cs-fixer-action/issues/19)
* feature: Support a local `config-path` so consumers can use their own php-cs-fixer config file.
* feature: Download shared rules from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) via raw GitHub refs (`rules-version` tag/branch/SHA), defaulting to `main`.
* feature: Validate Action inputs (version tag, boolean flags, git refs, config path) and pass them through environment variables instead of interpolating them into shell.
* feature: Add ShellCheck, input-validation tests, fixture-based Action CI, Dependabot, Docker Compose, and a root CONTRIBUTING.md.
* fix: Point ShellCheck at `source-path=SCRIPTDIR` so sourced helpers resolve from each script directory in CI.
* docs: Document both shared-rules and local-config usage modes.
* docs: Point README usage examples at `@v1.0.3` and explain patch vs major pinning. [#25](https://github.com/ale94lko/php-cs-fixer-action/issues/25)
* docs: Add copy-pasteable consumer workflows, expand the Architecture section, and replace stale live-run links with current CI jobs. [#24](https://github.com/ale94lko/php-cs-fixer-action/issues/24)

Changelog for v1.0.2
--------------------

* feature: Show detailed code style errors in the Action console (files, fixers and diffs) when violations are found. [#9](https://github.com/ale94lko/php-cs-fixer-action/issues/9)
* fix: Bump default php-cs-fixer to `v3.95.21` and set `PHP_CS_FIXER_IGNORE_ENV` so the Action works on current GitHub runners (PHP 8.3+).
* chore: Point the self-test workflow at the local Action and update `actions/checkout` to v4.

Changelog for v1.0.1
--------------------

* feature: Add a template for bug reporting issues for better understanding of the error. [#8](https://github.com/ale94lko/php-cs-fixer-action/issues/8)
* feature: Update documentation

Changelog for v1.0.0
--------------------

* First stable release.