#!/usr/bin/env python3
"""Download asset URLs referenced from data.js while preserving the original path structure.

This covers image references like "img/s/2.png" and other relative asset strings used
by the game's data definitions.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ASSET_RE = re.compile(r'(["\'])([A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp|gif|mp3|wav|ogg|json|js|css|svg))(?:\1)', re.IGNORECASE)


def extract_asset_urls(data_js_path: Path) -> list[str]:
    text = data_js_path.read_text(encoding="utf-8", errors="ignore")
    matches = ASSET_RE.findall(text)
    paths = []
    seen: set[str] = set()
    for _, value in matches:
        if value.startswith(("data:", "blob:", "#")):
            continue
        if value not in seen:
            seen.add(value)
            paths.append(value)
    return sorted(paths)


def normalize_asset_url(base_url: str, rel_path: str) -> str:
    candidate = rel_path.strip()
    if candidate.startswith(("http://", "https://")):
        return candidate
    if candidate.startswith("//"):
        return "https:" + candidate
    return urljoin(base_url, candidate)


def download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; DataAssetDownloader/1.0)",
        "Referer": "https://volamidle.pages.dev/",
    })
    with urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download assets referenced in data.js while preserving original directories.")
    parser.add_argument("--base-url", default="https://volamidle.pages.dev/", help="Base site URL.")
    parser.add_argument("--data-js", default="data.js", help="Path to the data.js file to scan.")
    parser.add_argument("--output-dir", default="assets", help="Root directory for downloaded assets. Example: assets/img/s/2.png")
    args = parser.parse_args()

    data_js_path = Path(args.data_js)
    if not data_js_path.exists():
        raise FileNotFoundError(f"data.js not found: {data_js_path}")

    output_root = Path(args.output_dir)
    asset_paths = extract_asset_urls(data_js_path)
    print(f"Found {len(asset_paths)} asset references in {data_js_path}")

    for rel_path in asset_paths:
        url = normalize_asset_url(args.base_url, rel_path)
        local_path = output_root / rel_path.lstrip("/")
        try:
            download_file(url, local_path)
            print(f"OK   {rel_path}")
        except Exception as exc:  # pragma: no cover - runtime download failure
            print(f"FAIL {rel_path} -> {exc}")

    print(f"\nDone. Files saved under: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
