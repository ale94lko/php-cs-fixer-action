CHANGELOG for PHP CS Fixer Action
==========================

This file contains changelogs for stable releases only.

Changelog for next
------------------

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