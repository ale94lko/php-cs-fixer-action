# Dependency pins and overrides

This Action is bundled with [`@vercel/ncc`](https://github.com/vercel/ncc) into `dist/index.js`. ncc 0.45 expects CommonJS-friendly graphs. Newer majors of some packages are ESM-only and leave `webpackMissingModule` stubs in the bundle (caught by `assertNoWebpackMissingModule` in [`scripts/dist-bundle.cjs`](../scripts/dist-bundle.cjs) and enforced by [`scripts/check-dist.cjs`](../scripts/check-dist.cjs) / the Rebuild dist workflow).

## Direct runtime pins (`package.json` → `dependencies`)

| Package | Pin | Why |
|---------|-----|-----|
| `@actions/cache` | `^4.1.0` | 5+/6+ are ESM-only; ncc cannot bundle them. Dependabot ignores major bumps ([`.github/dependabot.yml`](../.github/dependabot.yml)). |
| `@actions/core` | `^1.11.1` | 2+/3+ are ESM-only; same ncc limitation and Dependabot ignore. |
| `ajv` | `^8.20.0` | JSON Schema validation for Action inputs; no special pin beyond the lockfile. |

After changing these versions, run:

```bash
npm run build
node scripts/check-dist.cjs
```

`check-dist.cjs` must exit 0 with no `webpackMissingModule` warning in `dist/index.js`.

## `overrides`

| Override | Why |
|----------|-----|
| `typescript` → `~5.9.3` | Keep the toolchain on a known 5.9 line across transitive `typescript-eslint` / Vite peers so `npm run typecheck` stays deterministic. |
| `undici` → `^6.28.0` | Align the HTTP client pulled by the Actions toolkit / Node fetch stack with a compatible 6.x release under the CJS-friendly `@actions/*` majors above. |
| `uuid` → `^11.1.1` | Transitive from `@actions/cache` 4.x; pin so the lockfile does not drift onto a uuid build that breaks the ncc graph. |

Treat `npm outdated` / [`dep-freshness.yml`](../.github/workflows/dep-freshness.yml) reports for these packages as **intentional friction**, not accidental neglect: bump only when ncc can bundle the new major (or when the bundler strategy changes).

## Related

- Rebuild guard: `scripts/dist-bundle.cjs` → `assertNoWebpackMissingModule`
- Freshness check: `node scripts/check-dist.cjs`
- Contributor note: [CONTRIBUTING.md](../CONTRIBUTING.md) (Quality checks / `dist/` rebuild)
