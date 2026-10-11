#!/usr/bin/env python3
"""Download all sound files used by the Vo Lam Idle game from the original site.

Example:
    python tools/download_volamidle_snd.py
    python tools/download_volamidle_snd.py --base-url https://volamidle.pages.dev/
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def extract_asset_paths(app_js_path: Path) -> list[str]:
    text = app_js_path.read_text(encoding="utf-8", errors="ignore")
    # The game stores assets like "snd/sound_a018_die.mp3", "music/music210.mp3",
    # and sprite frames like "ani051_run.webp" / "img/pl/xxx.png".
    matches = re.findall(
        r'(["\'])([A-Za-z0-9_./-]+\.(?:mp3|webp|png|jpg|jpeg))\1',
        text,
    )
    paths = sorted({path for _, path in matches})
    if not paths:
        raise RuntimeError(
            f"No downloadable asset paths found in {app_js_path}. "
            "This script expects the game's app.js to contain audio or sprite asset references."
        )
    return paths


def resolve_asset_location(base_url: str, rel_path: str) -> tuple[str, Path]:
    path = rel_path.strip().lstrip("/")
    if not path:
        return urljoin(base_url, rel_path), Path(rel_path)

    raw_candidates: list[str]
    if "/" in path:
        raw_candidates = [path]
    else:
        raw_candidates = [
            f"img/a/{path}",
            f"img/pl/{path}",
            f"img/{path}",
            path,
        ]

    seen: set[str] = set()
    for value in raw_candidates:
        candidate = urljoin(base_url, value)
        if candidate in seen:
            continue
        seen.add(candidate)

        try:
            req = Request(candidate, headers={
                "User-Agent": "Mozilla/5.0 (compatible; VolamIdleDownloader/1.0)",
                "Referer": "https://volamidle.pages.dev/",
            })
            with urlopen(req, timeout=20):
                return candidate, Path(value)
        except Exception:
            continue

    return urljoin(base_url, path), Path(path)


def download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; VolamIdleDownloader/1.0)",
        "Referer": "https://volamidle.pages.dev/",
    })
    with urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Vo Lam Idle sound files from the original site.")
    parser.add_argument(
        "--base-url",
        default="https://volamidle.pages.dev/",
        help="Base URL of the original game site.",
    )
    parser.add_argument(
        "--output-dir",
        default="assets",
        help="Root directory to save the extracted asset tree, preserving the original relative paths such as img/a/ani051_run.webp.",
    )
    args = parser.parse_args()

    workspace_root = Path(__file__).resolve().parents[1]
    app_js_path = workspace_root / "app.js"
    if not app_js_path.exists():
        raise FileNotFoundError(f"Could not find app.js at {app_js_path}")

    asset_paths = extract_asset_paths(app_js_path)
    output_root = workspace_root / args.output_dir
    print(f"Found {len(asset_paths)} asset files. Base URL: {args.base_url}")

    for rel_path in asset_paths:
        url, relative_dest = resolve_asset_location(args.base_url, rel_path)
        local_path = output_root / relative_dest
        try:
            download_file(url, local_path)
            print(f"OK   {relative_dest.as_posix()}")
        except Exception as exc:  # pragma: no cover - runtime download failure
            print(f"FAIL {rel_path} -> {exc}")

    print(f"\nDone. Files saved under: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
