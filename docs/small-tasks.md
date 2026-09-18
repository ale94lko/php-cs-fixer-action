# Small tasks for new contributors

Clear, bounded work suitable for first-time or casual contributors. Prefer issues labeled [`good first issue`](https://github.com/ale94lko/php-cs-fixer-action/labels/good%20first%20issue) or [`help wanted`](https://github.com/ale94lko/php-cs-fixer-action/labels/help%20wanted) when present.

## Suggested starter tasks

1. **Docs** — fix a README/CONTRIBUTING typo or add an example workflow under `examples/`.
2. **Tests** — add a Vitest case for an uncovered branch called out in coverage output (`npm run test:coverage`).
3. **Fixtures** — extend `tests/fixtures/` with a small PHP sample that exercises a reported annotation edge case.
4. **Scripts** — improve help text or edge-case handling in `scripts/*.mjs` / `scripts/*.sh` with a matching `tests/*.sh` case.
5. **Dependencies** — review an open Dependabot PR for a patch/minor bump (no major `@actions/*` without reading [dependency-notes.md](dependency-notes.md)).

## How to pick one

1. Open [Issues](https://github.com/ale94lko/php-cs-fixer-action/issues) and filter by `good first issue`.
2. Comment on the issue to claim it.
3. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) (DCO, tests, Conventional Commits).

Maintainers will keep labeling approachable issues as they triage.
