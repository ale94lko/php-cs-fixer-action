# Contributing to php-cs-fixer-action

Thanks for helping improve this GitHub Action. Please also read the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Development setup

Requires Node.js 24+.

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
cp .env.example .env
npm ci
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
shfmt -d -i 2 scripts
actionlint
```

Format shell scripts with `shfmt -w -i 2 scripts` (CI runs `shfmt -d -i 2` on `scripts/`). `.editorconfig` sets UTF-8, LF, and trim-whitespace so Windows checkouts do not drift.

Lint workflows with [`actionlint`](https://github.com/rhysd/actionlint) (`actionlint` from the repo root, or `actionlint -color`). It checks `.github/workflows/` only; composite `action.yml` is not supported. CI pins [v1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12). Install locally from the [actionlint README](https://github.com/rhysd/actionlint#installation). When `shellcheck` is on `PATH`, actionlint also lints `run:` scripts.

After changing `src/` or lockfile dependencies, commit the rebuilt `dist/` in the same change. Dependabot PRs that touch `package.json` or `package-lock.json` get `dist/` rebuilt automatically; do not merge a bump if that workflow fails (`ncc` cannot bundle ESM-only `@actions/cache` 5+/6+ or `@actions/core` 2+/3+). CI checks a `src-hash` banner in `dist/index.js` instead of a byte-for-byte ncc diff, because Windows and Linux ncc output is not identical. Keep `@actions/cache` on `^4.1.0` and `@actions/core` on `^1.11.1`. `dist/` is marked generated and ignored in `.github/codeql/codeql-config.yml` so CodeQL scans `src/` rather than the ncc vendor bundle. CodeQL runs on push/PR to `main` and weekly (`.github/workflows/codeql.yml`). OpenSSF Scorecard runs on `main` and weekly (`.github/workflows/scorecard.yml`); add the README badge only after a successful run on `main`.

When bumping the default `php-cs-fixer-version`, keep `checksums.txt` in the same change:

```bash
bash scripts/update-checksums.sh v3.95.21
```

A weekly workflow (`bump-php-cs-fixer.yml`) opens that PR automatically (`bash scripts/bump-php-cs-fixer.sh`, then `npm run build`).

Run php-cs-fixer against the clean fixtures (needs PHP 8.3+ and network to download the phar):

```bash
bash scripts/ci-local.sh
```

Or with Docker:

```bash
docker build -t php-cs-fixer-action .
docker run --rm php-cs-fixer-action
```

```bash
docker compose run --rm fixer
```

CI jobs: `lint` (ESLint, ShellCheck, shfmt, actionlint), `typecheck`, `test` (Vitest + coverage thresholds), `check` on clean fixtures, `check` on a dirty fixture (must fail, with file-level annotations rather than a generic `::error::`), and `fix` on a dirty fixture (must rewrite the file). The dirty-fixture check job is expected to fail the Action step; the workflow only fails if that Action *does not* fail.

Keep changes small: one fix or feature per commit/PR, including the tests that pin the new behavior.

## Workflow

1. Search [existing issues](https://github.com/ale94lko/php-cs-fixer-action/issues) before opening a new one.
2. Fork the repository and create a focused branch.
3. Add or update tests for the behavior you change.
4. Open a pull request and [link it to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
5. Enable [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).

## Security reports

Please do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
