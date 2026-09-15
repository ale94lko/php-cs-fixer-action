<h1 align="center">PHP Coding Standards Fixer Action</h1>
<p>
  <a href="https://github.com/ale94lko/php-cs-fixer-action/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  </a>
  <a href="https://github.com/ale94lko/repo-health-score">
    <img src="https://github.com/ale94lko/php-cs-fixer-action/blob/output/badge.svg"/>
  </a>
</p>

> A GitHub Action to check or fix PHP Coding Standards using [php-cs-fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer).

By default (`mode: check`) the Action runs `--dry-run`. Style violations fail the step, emit inline `::error file=,line=` annotations on the PR, and write a markdown table to the job summary. Set `mode: fix` to write those changes in the workspace (rewritten files are reported as warnings).

This is a Node 24 TypeScript Action (`dist/index.js`). Default behavior stays check-only so existing workflows keep failing on violations without rewriting files. The runner still needs PHP 8.3+ (for example `shivammathur/setup-php`) because php-cs-fixer itself is a PHP phar. The Action verifies the downloaded phar against `checksums.txt` and caches it across CI runs when the workflow has `actions: write` (or at least cache write) permission.

Rules can come from:

1. The shared [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) repository (default), or
2. A config file already present in your own repository (`config-path`).

## Requirements

- Be sure to have set the following before using the action
  ```yaml
  - uses: actions/checkout@v5
  ```

## Setup

- Include the following in your action:
  ```yaml
  - name: php-cs-fixer
    uses: ale94lko/php-cs-fixer-action@v1.0.3
  ```

Pin a patch tag (`@v1.0.3`) so CI stays on a known release. A floating major pin (`@v1`) would pick up compatible 1.x updates automatically, but that tag is not published yet — keep using the latest patch tag until it is.

When you do not set `config-path`, the Action downloads shared rules from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules). By default it pins that package to release tag **`v1.0.1`** (`rules-version`), so CI does not silently pick up changes pushed to `main`. Override `rules-version` with another tag, branch (for example `main`), or commit SHA when you want a different ref.

## Parameters

| Name | Description | Required | Default | Values |
|----------|:----------:|:----------:|:----------:|:----------:|
| php-cs-fixer-version | Version of php-cs-fixer to download | `false` | `v3.95.21` | v`X.X.X` |
| config-path | Path to a local php-cs-fixer config in your repo. When set, skips downloading from php-cs-fixer-rules | `false` | _(empty)_ | e.g. `.php-cs-fixer.dist.php` |
| rules-version | Git ref (tag, branch or SHA) of [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) used when `config-path` is empty | `false` | `v1.0.1` | `v1.0.1`, `main`, SHA… |
| use-full-rules | Whether to use the full rules package or the minimal one from php-cs-fixer-rules | `false` | `true` | `true` OR `false` |
| mode | `check` reports violations without writing files (`--dry-run`). `fix` applies changes | `false` | `check` | `check` OR `fix` |
| paths | Space-separated files or directories, relative to the workspace, passed to php-cs-fixer. Empty uses the config finder | `false` | _(empty)_ | e.g. `src tests` |

## Integrity and cache

The Action verifies `php-cs-fixer.phar` against the SHA-256 in `checksums.txt` and fails closed on mismatch or a failed download. Unknown `php-cs-fixer-version` values also fail until their digest is added (`bash scripts/update-checksums.sh vX.Y.Z`).

It then caches the phar with `@actions/cache`, keyed by version + hash. Grant cache write so later CI runs can reuse it:

```yaml
permissions:
  contents: read
  actions: write
```

If the cache service is unavailable (local runs, missing permission, fork PR), the Action downloads again and still verifies the checksum.

## Examples

### Simple use with default parameters (shared rules pinned to `v1.0.1`)
```yaml
name: Fix code styles
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: PHP Code Style
        uses: ale94lko/php-cs-fixer-action@v1.0.3
        # rules-version defaults to v1.0.1; omit or override as needed
```

### Use a config file from your own repository
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     config-path: .php-cs-fixer.dist.php
```

### Override the shared rules ref (tag, branch, or SHA)
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     rules-version: main
+     use-full-rules: true
```

### Use the minimal shared ruleset
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     use-full-rules: false
```

### Override php-cs-fixer version
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     php-cs-fixer-version: v3.95.21
```

### Check only (default)
```yaml
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
    with:
      mode: check
```

### Apply fixes to selected paths
```yaml
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
    with:
      mode: fix
      paths: src tests
```

## View live

- [Successful test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461553837?check_suite_focus=true)
- [Failure test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461551350?check_suite_focus=true)

## Architecture

`action.yml` declares the inputs. `src/` validates them, downloads the php-cs-fixer phar (SHA-256 from `checksums.txt`, restored from the Actions cache when possible), resolves a config (`config-path` or [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules)), then runs `php php-cs-fixer fix --format=json` (`--dry-run` in `check` mode; writes files in `fix` mode). Optional `paths` are appended as php-cs-fixer arguments after they are checked to stay inside the workspace. Violations become file-level annotations and a `$GITHUB_STEP_SUMMARY` table; the Action fails with `process.exitCode = 1` instead of a generic `::error::`. The bundled entrypoint is `dist/index.js` (built with `npm run build`).

## Local development

Requires Node.js 24+ and, to run the fixer locally, PHP 8.3+.

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
cp .env.example .env
npm ci
npm test
npm run build
```

Run php-cs-fixer against the clean fixtures (downloads the phar, needs network once):

```bash
bash scripts/ci-local.sh
```

### Docker (one command)

```bash
docker compose run --rm fixer
```

## Contributing

Please read through our [contributing guidelines](CONTRIBUTING.md).

## License

**php-cs-fixer-action** is an open source project that is licensed under [MIT](https://opensource.org/licenses/MIT).
