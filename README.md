<h1 align="center">PHP Coding Standards Fixer Action</h1>
<p>
  <a href="https://github.com/ale94lko/php-cs-fixer-action/blob/main/LICENSE" target="_blank">
    <img alt="License: Source-Available (AI restricted)" src="https://img.shields.io/badge/License-Source--Available-blue.svg" />
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

Pin a patch tag (`@v1.0.3`) so CI stays on a known release. Pushing a `vX.Y.Z` tag publishes a GitHub Release from `CHANGELOG.md` and force-updates the floating major tag (`@v1`) so it tracks the latest compatible 1.x. Until that major tag exists, keep using the latest patch tag.

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

The Action verifies `php-cs-fixer.phar` against the SHA-256 in `checksums.txt` and fails closed on mismatch or a failed download. Unknown `php-cs-fixer-version` values also fail until their digest is added (`bash scripts/update-checksums.sh vX.Y.Z`). A weekly workflow opens a PR that bumps the default tag and checksum together.

It then caches the phar with `@actions/cache`, keyed by version + hash. Grant cache write so later CI runs can reuse it:

```yaml
permissions:
  contents: read
  actions: write
```

If the cache service is unavailable (local runs, missing permission, fork PR), the Action downloads again and still verifies the checksum.

## Examples

Copy-pasteable consumer workflows live in [`examples/check.yml`](examples/check.yml) (fail CI on violations) and [`examples/fix.yml`](examples/fix.yml) (apply fixes and commit them). Those files include `actions/checkout` and `shivammathur/setup-php`; the snippets below show only the Action step.

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

## CI

Self-tests run in [`.github/workflows/ci.yml`](https://github.com/ale94lko/php-cs-fixer-action/actions/workflows/ci.yml):

- [Pass on clean fixtures](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447185) (`action-passes-on-clean-fixtures`)
- [Fail the Action on violations](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447500) (`action-fails-on-violations`; the workflow job succeeds after asserting that the Action step failed)
- [Apply fixes to a dirty fixture](https://github.com/ale94lko/php-cs-fixer-action/actions/runs/34969930522/job/104383447489) (`action-fixes-dirty-fixture`)
- `docker-offline` builds the image (vendors php-cs-fixer) and lints the fixtures with `--network=none`

## Architecture

`action.yml` declares the public inputs and outputs and points `runs.main` at the bundled entrypoint `dist/index.js` (built from `src/index.ts` with `npm run build`).

Runtime pipeline (`src/run.ts`):

1. **Read inputs** (`src/inputs.ts`) from `action.yml`, with env fallbacks used by Docker and `scripts/ci-local.sh`.
2. **Validate** (`src/validate.ts`) against [`action.inputs.schema.json`](action.inputs.schema.json) with [Ajv](https://ajv.js.org/), then keep `paths` inside the workspace.
3. **Resolve php-cs-fixer** (`src/download-fixer.ts`) — reuse a verified workspace or `PHP_CS_FIXER_PHAR` binary (Docker vendors it at build time), else restore from the Actions cache, else download `php-cs-fixer.phar` from GitHub Releases.
4. **Resolve config** (`src/resolve-config.ts`):
   - If `config-path` is set, use that file from the consumer repository.
   - Otherwise download from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) at `rules-version` (full or min file via `use-full-rules`).
5. **Run the fixer** (`src/run-fixer.ts`) — `php php-cs-fixer fix --format=json` (`--dry-run` in `check` mode; writes files in `fix` mode). Optional `paths` are appended after they are checked to stay inside the workspace.
6. **Report** (`src/report.ts`) — file-level annotations, a `$GITHUB_STEP_SUMMARY` table, and the `code-style-result` output. Style violations fail with `process.exitCode = 1` instead of a generic `::error::`.

| Path | Role |
|------|------|
| `action.yml` | Public inputs, outputs, and Node 24 entrypoint |
| `action.inputs.schema.json` | JSON Schema contract for those inputs (enforced with Ajv) |
| `src/index.ts` | Loads `run()` |
| `src/run.ts` | Orchestrates validate → download → resolve config → run fixer → report |
| `dist/index.js` | Bundled file GitHub Actions actually executes |
| `.env.example` | Env vars for Docker / `scripts/ci-local.sh` |
| `Dockerfile`, `docker-compose.yml` | PHP 8.3 + Node 24 image with a checksum-verified php-cs-fixer phar at `/opt/php-cs-fixer/php-cs-fixer` |
| `.devcontainer/devcontainer.json` | Dev Container (PHP 8.3, Node 24, `npm ci`) |
| `.github/workflows/scorecard.yml` | OpenSSF Scorecard on `main` / weekly (accepted low scores in CONTRIBUTING / [#53](https://github.com/ale94lko/php-cs-fixer-action/issues/53)) |

### Repo health badge

[`.github/workflows/health_score.yml`](.github/workflows/health_score.yml) publishes the README badge on a schedule. It uses workflow-level `permissions: {}` and grants `contents: write` only on the badge job, then passes `token: ${{ secrets.GITHUB_TOKEN }}` to [`ale94lko/repo-health-score`](https://github.com/ale94lko/repo-health-score) so that job can push the generated badge.
`action.yml` declares the inputs. [`action.inputs.schema.json`](action.inputs.schema.json) is the machine-readable contract; `src/` validates against it with Ajv, resolves php-cs-fixer (vendored phar, Actions cache, or a SHA-256-verified download from `checksums.txt`), resolves a config (`config-path` or [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules)), then runs `php php-cs-fixer fix --format=json` (`--dry-run` in `check` mode; writes files in `fix` mode). Optional `paths` are appended as php-cs-fixer arguments after they are checked to stay inside the workspace. Violations become file-level annotations and a `$GITHUB_STEP_SUMMARY` table; the Action fails with `process.exitCode = 1` instead of a generic `::error::`. Failures (invalid inputs, download/config errors, fixer non-zero exit) go through one helper that logs JSON `{step,code,message}` and `core.setFailed`. Set `ERROR_TRACKING_URL` to POST that payload to an http(s) webhook; it is optional and unset by default. The bundled entrypoint is `dist/index.js` (built with `npm run build`).

## Local development

Requires Node.js 24+ and, to run the fixer locally, PHP 8.3+. Copy [`.env.example`](.env.example) to `.env` (used by `scripts/ci-local.sh` and Docker). A [Dev Container](.devcontainer/devcontainer.json) provides PHP 8.3, Node 24, and `npm ci`.

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
cp .env.example .env
npm ci
npm audit --omit=dev --audit-level=high
npm test
npm run build
```

### Tests (offline)

Unit tests mock HTTP and do not download php-cs-fixer or php-cs-fixer-rules. CI Action jobs (`action-passes-on-clean-fixtures`, `action-fails-on-violations`, `action-fixes-dirty-fixture`) pass `config-path: tests/fixtures/.php-cs-fixer.dist.php`, so they never hit php-cs-fixer-rules.

```bash
npm test
npm run test:coverage
```

### Run the fixer locally (offline after `docker build`)

`scripts/ci-local.sh` reuses a verified `php-cs-fixer` in the workspace or `PHP_CS_FIXER_PHAR`. The first local run without those still needs network to download the phar.

```bash
bash scripts/ci-local.sh
```

The Docker image vendors the pinned phar at **build** time (checksum from `checksums.txt`) and defaults to the local fixture config, so linting the fixtures does not download php-cs-fixer or php-cs-fixer-rules at start:

```bash
docker build -t php-cs-fixer-action .
docker run --rm --network=none php-cs-fixer-action
```

Or with Compose (phar lives at `/opt/php-cs-fixer/php-cs-fixer`, outside the `.:/app` mount):

```bash
docker compose build
docker compose run --rm --network none fixer
```

## Contributing

Please read through our [contributing guidelines](CONTRIBUTING.md).

## License

**php-cs-fixer-action** is source-available under the terms in [`LICENSE`](LICENSE): use, modification, and distribution are allowed, but using this software or its documentation to train, fine-tune, evaluate, or synthesize AI/ML/LLM systems requires a separate paid written agreement with the copyright holder.
