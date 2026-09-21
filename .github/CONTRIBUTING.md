# Welcome to php-cs-fixer-action contributing guide

Thank you for investing your time in contributing to our project! Contributions are always **welcome and recommended**!

The canonical guide lives in the repository root: [CONTRIBUTING.md](../CONTRIBUTING.md).

Read our [Code of Conduct](https://github.com/ale94lko/php-cs-fixer-action/blob/main/.github/CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Getting started

1. Fork the repository.
2. Create a working branch.
3. Run the checks:

   ```bash
   bash scripts/dev-check.sh
   ```

   Or, when iterating on tests only: `npm test`.

4. Keep changes small: one feature or fix per commit/PR, with tests that pin the new behavior (required for new functionality). Use [Conventional Commits](https://www.conventionalcommits.org/).
5. Open a pull request and [link it to the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
