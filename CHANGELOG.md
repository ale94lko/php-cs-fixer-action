CHANGELOG for PHP CS Fixer Action
==========================

This file contains changelogs for stable releases only.

Changelog for next
------------------

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