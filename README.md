<h1 align="center">PHP Coding Standards Fixer Action</h1>
<p>
  <a href="https://github.com/ale94lko/php-cs-fixer-action/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  </a>
  <a href="https://github.com/ale94lko/repo-health-score">
    <img src="https://github.com/ale94lko/php-cs-fixer-action/blob/output/badge.svg"/>
  </a>
</p>

> A GitHub Action to check PHP Coding Standards using [php-cs-fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer).

When style violations are found, the Action fails and prints a detailed console report (affected files, applied fixers and diffs) so you know exactly what to fix.

This is a Node 24 TypeScript Action (`dist/index.js`). Public inputs and the `code-style-result` output are unchanged from the previous composite Action. The runner still needs PHP 8.3+ (for example `shivammathur/setup-php`) because php-cs-fixer itself is a PHP phar.

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
    uses: ale94lko/php-cs-fixer-action@v1.0.2
  ```

## Parameters

| Name | Description | Required | Default | Values |
|----------|:----------:|:----------:|:----------:|:----------:|
| php-cs-fixer-version | Version of php-cs-fixer to download | `false` | `v3.95.21` | v`X.X.X` |
| config-path | Path to a local php-cs-fixer config in your repo. When set, skips downloading from php-cs-fixer-rules | `false` | _(empty)_ | e.g. `.php-cs-fixer.dist.php` |
| rules-version | Git ref (tag, branch or SHA) of [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) used when `config-path` is empty | `false` | `main` | `main`, `v1.0.1`, SHA… |
| use-full-rules | Whether to use the full rules package or the minimal one from php-cs-fixer-rules | `false` | `true` | `true` OR `false` |

## Examples

### Simple use with default parameters (shared rules from `php-cs-fixer-rules`)
```yaml
name: Fix code styles
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: PHP Code Style
        uses: ale94lko/php-cs-fixer-action@v1.0.2
```

### Use a config file from your own repository
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.2
+   with:
+     config-path: .php-cs-fixer.dist.php
```

### Pin shared rules to a specific ref
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.2
+   with:
+     rules-version: v1.0.1
+     use-full-rules: true
```

### Use the minimal shared ruleset
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.2
+   with:
+     use-full-rules: false
```

### Override php-cs-fixer version
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.2
+   with:
+     php-cs-fixer-version: v3.95.21
```

## View live

- [Successful test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461553837?check_suite_focus=true)
- [Failure test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461551350?check_suite_focus=true)

## Architecture

`action.yml` declares the inputs. `src/` validates them, downloads the php-cs-fixer phar, resolves a config (`config-path` or [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules)), then runs `php php-cs-fixer fix --dry-run`. The bundled entrypoint is `dist/index.js` (built with `npm run build`).

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
