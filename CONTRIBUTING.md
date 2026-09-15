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
```

After changing `src/`, commit the rebuilt `dist/` in the same change. CI fails if `dist/` is stale. When bumping the default `php-cs-fixer-version`, update `checksums.txt` with:

```bash
bash scripts/update-checksums.sh v3.95.21
```

Run php-cs-fixer against the clean fixtures (needs PHP 8.3+ and network to download the phar):

```bash
bash scripts/ci-local.sh
```

Or with Docker:

```bash
docker compose run --rm fixer
```

CI jobs: `lint`, `typecheck`, `test` (Vitest + coverage thresholds), `check` on clean fixtures, `check` on a dirty fixture (must fail, with file-level annotations rather than a generic `::error::`), and `fix` on a dirty fixture (must rewrite the file). The dirty-fixture check job is expected to fail the Action step; the workflow only fails if that Action *does not* fail.

Keep changes small: one fix or feature per commit/PR, including the tests that pin the new behavior.

## Workflow

1. Search [existing issues](https://github.com/ale94lko/php-cs-fixer-action/issues) before opening a new one.
2. Fork the repository and create a focused branch.
3. Add or update tests for the behavior you change.
4. Open a pull request and [link it to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
5. Enable [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).

## Security reports

Please do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
