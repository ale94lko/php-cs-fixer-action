# Architecture

High-level design of **php-cs-fixer-action**, a Node 24 TypeScript GitHub Action that downloads a pinned `php-cs-fixer` phar, verifies it, and runs check or fix against a PHP workspace.

## Components

```text
Workflow (consumer)
    │  uses: ale94lko/php-cs-fixer-action@v…
    ▼
dist/index.js  ◄── ncc bundle of src/
    │
    ├─ validate inputs (Ajv + action.inputs.schema.json)
    ├─ resolve config path / rules repo
    │     └─ SHA-256 vs rules-checksums.txt when downloading shared rules
    ├─ downloadFixer (HTTPS GitHub Releases)
    │     └─ SHA-256 vs checksums.txt (fail-closed)
    │     └─ optional @actions/cache (re-verify on restore)
    ├─ runFixer (spawn php + phar; check or fix)
    └─ report (annotations, job summary, optional SARIF, optional webhook)
```

| Area | Location | Role |
| --- | --- | --- |
| Entry | `src/index.ts` → `dist/index.js` | Action entrypoint |
| Orchestration | `src/run.ts` | Wire download → execute → report |
| Integrity | `src/download-fixer.ts`, `src/checksums.ts`, `checksums.txt` | Pin and verify phar |
| Integrity | `src/resolve-config.ts`, `src/rules-checksums.ts`, `rules-checksums.txt` | Pin and verify shared rules |
| Cache | `src/cache.ts` | Actions cache after verify |
| Inputs | `src/validate.ts`, `action.yml` | Schema-validated inputs |
| Reporting | `src/report.ts` | Annotations / summary / optional SARIF |
| DI | `ActionDeps` in tests | Swap HTTP/fs/exec in unit and integration tests |

## Trust boundaries

1. **Consumer workflow** — supplies workspace files, inputs, and token permissions.
2. **This Action** — only trusts phar bytes that match `checksums.txt` and shared-rules configs that match `rules-checksums.txt`; never runs an unverified download.
3. **GitHub Releases (PHP-CS-Fixer)** — upstream artifact source over HTTPS.
4. **Actions cache** — untrusted until digest re-check succeeds.
See [SECURITY.md](../SECURITY.md) and [assurance-case.md](assurance-case.md) for the security argument.

## Build

- Source of truth is TypeScript under `src/`.
- `npm run build` (`ncc`) produces the committed `dist/` consumers execute.
- CI rebuilds `dist/` on relevant PRs and checks a `src-hash` banner (byte-identical ncc across OS is not required).

## Non-goals

This is not a long-running service or a general PHP application framework. Distribution is the GitHub Action (`dist/index.js`), not a packaged runtime image.
