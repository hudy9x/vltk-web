#!/usr/bin/env python3
"""Download the asset URLs declared in service worker cache lists (sw.js).

This reads the asset list from the service worker's BUST array and the ASSET regex logic,
then downloads the matching files while preserving their original directory structure.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def extract_sw_asset_paths(sw_path: Path) -> list[str]:
    text = sw_path.read_text(encoding="utf-8", errors="ignore")
    paths: list[str] = []
    seen: set[str] = set()

    # Matches the BUST array entries: "img/z/397.jpg"
    for match in re.finditer(r'"([A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf))"', text, re.IGNORECASE):
        value = match.group(1)
        if value not in seen:
            seen.add(value)
            paths.append(value)

    # Also capture any direct asset-looking strings from the service worker
    for match in re.finditer(r'"([A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf))"', text, re.IGNORECASE):
        value = match.group(1)
        if value not in seen:
            seen.add(value)
            paths.append(value)

    return sorted(paths)


def download_file(url: str, dest: Path) -> None:
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; SWAssetDownloader/1.0)",
        "Referer": "https://volamidle.pages.dev/",
    })
    with urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download service-worker cached assets while preserving their original paths.")
    parser.add_argument("--base-url", default="https://volamidle.pages.dev/", help="Site base URL.")
    parser.add_argument("--sw-js", default="sw.js", help="Path to the service worker file.")
    parser.add_argument("--output-dir", default="assets", help="Root output directory; keeps relative paths like img/z/397.jpg")
    args = parser.parse_args()

    sw_path = Path(args.sw_js)
    if not sw_path.exists():
        raise FileNotFoundError(f"Service worker not found: {sw_path}")

    output_root = Path(args.output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    paths = extract_sw_asset_paths(sw_path)
    print(f"Found {len(paths)} asset entries in {sw_path}")

    for rel_path in paths:
        url = urljoin(args.base_url, rel_path.lstrip("/"))
        local_path = output_root / rel_path.lstrip("/")
        if local_path.exists():
            print(f"SKIP {rel_path}")
            continue
        try:
            download_file(url, local_path)
            print(f"OK   {rel_path}")
        except Exception as exc:  # pragma: no cover - runtime download failure
            print(f"FAIL {rel_path} -> {exc}")

    print(f"\nDone. Files saved under: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
