# Roadmap

What this project intends to do (and not do) over the next year. Updated with releases and major planning issues.

## Do

- Keep the Action on a supported Node.js LTS line used by GitHub Actions runners.
- Keep default `php-cs-fixer-version` and [`checksums.txt`](../checksums.txt) current via the weekly bump workflow.
- Preserve fail-closed download integrity (HTTPS + SHA-256 pins + cache re-verify).
- Maintain OpenSSF Best Practices (Passing; pursue Silver) and OpenSSF Scorecard health on `main`.
- Grow Vitest unit/integration coverage for download, cache, `run()`, and input validation.
- Keep `dist/` rebuildable in CI and document dependency pins that block ESM-only `@actions/*` majors ([dependency-notes.md](dependency-notes.md)).

## Do not

- Turn this repository into a general PHP application framework or deployment stack.
- Replace checksum verification with “download and run” without pins.
- Drop CodeQL, commitlint, or required review for convenience.
- Add OSS-Fuzz unless a parser/network attack surface appears that warrants it (Scorecard Fuzzing remains an accepted low).

## Horizon notes

- Consumers pin Action tags (`@v1` / `@v1.x.y`); major bumps will be called out in `CHANGELOG.md`.
- Silver/Gold Best Practices criteria may drive more docs (governance, assurance case) without changing runtime behavior.
