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

This is a Node 24 TypeScript Action (`dist/index.js`). Default behavior stays check-only so existing workflows keep failing on violations without rewriting files. The runner still needs PHP 8.3+ (for example `shivammathur/setup-php`) because php-cs-fixer itself is a PHP phar.

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

## Parameters

| Name | Description | Required | Default | Values |
|----------|:----------:|:----------:|:----------:|:----------:|
| php-cs-fixer-version | Version of php-cs-fixer to download | `false` | `v3.95.21` | v`X.X.X` |
| config-path | Path to a local php-cs-fixer config in your repo. When set, skips downloading from php-cs-fixer-rules | `false` | _(empty)_ | e.g. `.php-cs-fixer.dist.php` |
| rules-version | Git ref (tag, branch or SHA) of [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) used when `config-path` is empty | `false` | `main` | `main`, `v1.0.1`, SHA… |
| use-full-rules | Whether to use the full rules package or the minimal one from php-cs-fixer-rules | `false` | `true` | `true` OR `false` |
| mode | `check` reports violations without writing files (`--dry-run`). `fix` applies changes | `false` | `check` | `check` OR `fix` |
| paths | Space-separated files or directories, relative to the workspace, passed to php-cs-fixer. Empty uses the config finder | `false` | _(empty)_ | e.g. `src tests` |

## Examples

Copy-pasteable consumer workflows live in [`examples/check.yml`](examples/check.yml) (fail CI on violations) and [`examples/fix.yml`](examples/fix.yml) (apply fixes and commit them). Those files include `actions/checkout` and `shivammathur/setup-php`; the snippets below show only the Action step.

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
        uses: ale94lko/php-cs-fixer-action@v1.0.3
```

### Use a config file from your own repository
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     config-path: .php-cs-fixer.dist.php
```

### Pin shared rules to a specific ref
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.3
+   with:
+     rules-version: v1.0.1
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

## CI

Self-tests run in [`.github/workflows/ci.yml`](https://github.com/ale94lko/php-cs-fixer-action/actions/workflows/ci.yml):

- [Pass on clean fixtures](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447185) (`action-passes-on-clean-fixtures`)
- [Fail the Action on violations](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447500) (`action-fails-on-violations`; the workflow job succeeds after asserting that the Action step failed)
- [Apply fixes to a dirty fixture](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447489) (`action-fixes-dirty-fixture`)

## Architecture

`action.yml` declares the public inputs and outputs and points `runs.main` at the bundled entrypoint `dist/index.js` (built from `src/index.ts` with `npm run build`).

Runtime pipeline (`src/run.ts`):

1. **Read inputs** (`src/inputs.ts`) from `action.yml`, with env fallbacks used by Docker and `scripts/ci-local.sh`.
2. **Validate** (`src/validate.ts`) version tags, booleans, git refs, `config-path`, `mode`, and `paths`.
3. **Download php-cs-fixer** (`src/download-fixer.ts`) — the pinned `php-cs-fixer.phar` from GitHub Releases.
4. **Resolve config** (`src/resolve-config.ts`):
   - If `config-path` is set, use that file from the consumer repository.
   - Otherwise download from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) at `rules-version` (full or min file via `use-full-rules`).
5. **Run the fixer** (`src/run-fixer.ts`) — `php php-cs-fixer fix --format=json` (`--dry-run` in `check` mode; writes files in `fix` mode). Optional `paths` are appended after they are checked to stay inside the workspace.
6. **Report** (`src/report.ts`) — file-level annotations, a `$GITHUB_STEP_SUMMARY` table, and the `code-style-result` output. Style violations fail with `process.exitCode = 1` instead of a generic `::error::`.

| Path | Role |
|------|------|
| `action.yml` | Public inputs, outputs, and Node 24 entrypoint |
| `src/index.ts` | Loads `run()` |
| `src/run.ts` | Orchestrates validate → download → resolve config → run fixer → report |
| `dist/index.js` | Bundled file GitHub Actions actually executes |
| `.env.example` | Env vars for Docker / `scripts/ci-local.sh` |
| `Dockerfile`, `docker-compose.yml` | PHP 8.3 + Node 24 image for local fixer runs |
| `.devcontainer/devcontainer.json` | Dev Container (PHP 8.3, Node 24, `npm ci`) |

### Repo health badge

[`.github/workflows/health_score.yml`](.github/workflows/health_score.yml) publishes the README badge on a schedule. It sets `permissions: contents: write` and passes `token: ${{ secrets.GITHUB_TOKEN }}` to [`ale94lko/repo-health-score`](https://github.com/ale94lko/repo-health-score) so the workflow can push the generated badge.

## Local development

Requires Node.js 24+ and, to run the fixer locally, PHP 8.3+. Copy [`.env.example`](.env.example) to `.env` (used by `scripts/ci-local.sh` and Docker). A [Dev Container](.devcontainer/devcontainer.json) provides PHP 8.3, Node 24, and `npm ci`.

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
cp .env.example .env
npm ci
npm test
npm run build
```

### Tests (offline)

Unit tests mock HTTP and do not download php-cs-fixer or php-cs-fixer-rules:

```bash
npm test
npm run test:coverage
```

### Run the fixer locally

`scripts/ci-local.sh` and Docker download `php-cs-fixer.phar` at runtime (needs network):

```bash
bash scripts/ci-local.sh
```

```bash
docker build -t php-cs-fixer-action .
docker run --rm php-cs-fixer-action
```

Or with Compose:

```bash
docker compose run --rm fixer
```

## Contributing

Please read through our [contributing guidelines](CONTRIBUTING.md).

## License

**php-cs-fixer-action** is an open source project that is licensed under [MIT](https://opensource.org/licenses/MIT).
