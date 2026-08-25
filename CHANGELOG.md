CHANGELOG for PHP CS Fixer Action
==========================

This file contains changelogs for stable releases only.

Changelog for next
------------------

* feature: Support a local `config-path` so consumers can use their own php-cs-fixer config file.
* feature: Download shared rules from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) via raw GitHub refs (`rules-version` tag/branch/SHA), defaulting to `main`.
* docs: Document both shared-rules and local-config usage modes.

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