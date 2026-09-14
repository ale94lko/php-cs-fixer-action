# Contributing to php-cs-fixer-action

Thanks for helping improve this GitHub Action. Please also read the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/ale94lko/php-cs-fixer-action.git
cd php-cs-fixer-action
cp .env.example .env
```

Run the input-validation tests (no PHP required):

```bash
bash tests/validate-inputs.test.sh
```

Run php-cs-fixer against the clean fixtures (needs PHP 8.3+ and network to download the phar):

```bash
bash scripts/ci-local.sh
```

Or start the same check with Docker:

```bash
docker compose run --rm fixer
```

## Quality checks

CI runs ShellCheck, the input-validation tests, a passing Action run on clean fixtures, and a failing Action run on a dirty fixture. Every push and pull request must stay green.

Keep changes small: one fix or feature per commit/PR, including the tests that pin the new behavior.

## Workflow

1. Search [existing issues](https://github.com/ale94lko/php-cs-fixer-action/issues) before opening a new one.
2. Fork the repository and create a focused branch.
3. Add or update tests for the behavior you change.
4. Open a pull request and [link it to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
5. Enable [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).

## Security reports

Please do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
