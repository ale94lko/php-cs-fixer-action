## Security

I take the security of my software products and services seriously, which
includes all source code repositories managed through GitHub.

If you believe you have found a security vulnerability in any repository, please
report it to me as described below.

## Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to me by sending an email to
[ale94lko@gmail.com](mailto:ale94lko@gmail.com).

Please include the requested information listed below (as much as you can
provide) to help me better understand the nature and scope of the possible
issue:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit the issue

This information will help me triage your report more quickly.

## Preferred Languages

We prefer all communications to be in English or Spanish.

## Policy

We follow the principle of [Coordinated Vulnerability Disclosure](https://www.iso.org/standard/72311.html).

## Download integrity threat model

This Action downloads `php-cs-fixer.phar` from [PHP-CS-Fixer GitHub Releases](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/releases)
(`src/download-fixer.ts`). The trust boundary is:

1. **Release download** — the phar bytes come from GitHub Releases for the
   requested `php-cs-fixer-version`.
2. **Checksum verification** — SHA-256 is checked against the digest pinned in
   this repository's [`checksums.txt`](checksums.txt). Verification is
   **fail-closed**: missing tags, download failures, and digest mismatches all
   abort the Action (they do not fall back to an unverified binary).
3. **Actions cache** — after a successful verify, the phar may be stored with
   `@actions/cache` (keyed by version + hash). Cache restore still re-verifies
   the digest before use. Consumer workflows that want reuse should grant cache
   write as documented in README [Integrity and cache](README.md#integrity-and-cache)
   (`permissions.actions: write` alongside `contents: read`). Without that
   permission (or when the cache service is unavailable), the Action downloads
   again and still verifies the checksum.

Fail-closed behavior is covered by unit tests in
[`src/checksums.test.ts`](src/checksums.test.ts) (unknown tags / malformed
table) and by the loopback integration coverage in
[`tests/integration/download-fixer.integration.test.ts`](tests/integration/download-fixer.integration.test.ts)
(download → verify against `checksums.txt` → cache reuse). Checksum mismatch
paths are also exercised in `src/download-fixer.test.ts` and `src/cache.test.ts`.
