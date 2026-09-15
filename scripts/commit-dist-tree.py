#!/usr/bin/env python3
"""Commit files from DIST_DIR onto BRANCH via the Git Data API.

Does not check out the target branch, so a privileged workflow_run job can
update dist/ without an untrusted pull-request checkout.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.github.com"


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        fail(f"{name} is required")
    return value


def api(token: str, method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "php-cs-fixer-action-commit-dist",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        fail(f"GitHub API {method} {path} failed ({error.code}): {detail}")
    return json.loads(payload) if payload else {}


def dist_files(root: Path) -> list[tuple[str, Path]]:
    files: list[tuple[str, Path]] = []
    for path in sorted(root.rglob("*")):
        if path.is_file():
            files.append((path.relative_to(root).as_posix(), path))
    if not files:
        fail(f"No files found in {root}")
    return files


def main() -> None:
    dist_dir = Path(env("DIST_DIR")).resolve()
    if not dist_dir.is_dir():
        fail(f"DIST_DIR is not a directory: {dist_dir}")

    index = dist_dir / "index.js"
    if not index.is_file():
        fail(f"Missing {index}")
    bundle = index.read_text(encoding="utf-8", errors="replace")
    if "webpackMissingModule" in bundle:
        fail(
            "dist/index.js contains webpackMissingModule; ncc could not bundle a dependency. "
            "Keep @actions/cache on ^4.1.0 and @actions/core on ^1.11.1 (CJS)."
        )

    token = env("GH_TOKEN")
    repo = env("GITHUB_REPOSITORY")
    branch = env("BRANCH")
    parent_sha = env("PARENT_SHA")
    encoded_repo = urllib.parse.quote(repo, safe="/")
    ref_path = f"/repos/{encoded_repo}/git/refs/heads/{urllib.parse.quote(branch, safe='/')}"

    parent = api(token, "GET", f"/repos/{encoded_repo}/git/commits/{parent_sha}")
    entries = []
    for relative, path in dist_files(dist_dir):
        blob = api(
            token,
            "POST",
            f"/repos/{encoded_repo}/git/blobs",
            {
                "content": base64.b64encode(path.read_bytes()).decode("ascii"),
                "encoding": "base64",
            },
        )
        entries.append({"path": f"dist/{relative}", "mode": "100644", "type": "blob", "sha": blob["sha"]})

    tree = api(
        token,
        "POST",
        f"/repos/{encoded_repo}/git/trees",
        {"base_tree": parent["tree"]["sha"], "tree": entries},
    )
    if tree["sha"] == parent["tree"]["sha"]:
        print("dist/ already up to date")
        return

    commit = api(
        token,
        "POST",
        f"/repos/{encoded_repo}/git/commits",
        {
            "message": "chore: rebuild dist so src-hash matches",
            "tree": tree["sha"],
            "parents": [parent_sha],
            "author": {
                "name": "github-actions[bot]",
                "email": "41898282+github-actions[bot]@users.noreply.github.com",
            },
        },
    )
    api(token, "PATCH", ref_path, {"sha": commit["sha"], "force": False})
    print(f"Updated {branch} with {commit['sha']}")


if __name__ == "__main__":
    main()
