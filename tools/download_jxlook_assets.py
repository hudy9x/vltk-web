#!/usr/bin/env python3
"""Download sprite-sheet assets referenced by jxlook.js while preserving the original directory structure.

Example:
    python tools/download_jxlook_assets.py
    python tools/download_jxlook_assets.py --output-dir assets
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen


KEY_RE = re.compile(r'"([A-Za-z0-9_\-/#:\.]+)"\s*:\s*\[', re.IGNORECASE)
EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg", ".gif"]


def normalize_asset_id(asset_id: str) -> str:
    value = str(asset_id).strip().strip('"\'')
    value = value.replace('\\', '/')
    value = value.replace('#sym:', '')
    value = value.replace('sym:', '')
    value = value.lstrip('/')
    return value


def extract_asset_ids(jxlook_path: Path) -> list[str]:
    text = jxlook_path.read_text(encoding="utf-8", errors="ignore")
    ids = []
    seen: set[str] = set()
    for match in KEY_RE.finditer(text):
        value = normalize_asset_id(match.group(1))
        if not value or value in seen:
            continue
        if value.startswith(("f/", "m/", "p/", "s/", "z/", "i/", "jx/")):
            seen.add(value)
            ids.append(value)
        elif re.fullmatch(r'[A-Za-z0-9_\-]+', value):
            seen.add(value)
            ids.append(value)
    return sorted(ids)


def resolve_live_url(base_url: str, asset_id: str) -> tuple[str, str]:
    clean_id = normalize_asset_id(asset_id)
    aliases: list[str] = []

    if clean_id.startswith(('img/', 'jx/')):
        aliases.append(clean_id)
    else:
        aliases.append(clean_id)
        if clean_id and not clean_id.startswith(('f/', 'm/', 'p/', 's/', 'z/', 'i/')):
            aliases.extend([f"f/{clean_id}", f"m/{clean_id}", f"p/{clean_id}", f"s/{clean_id}", f"z/{clean_id}", f"i/{clean_id}"])
        if clean_id.startswith(('f/', 'm/', 'p/', 's/', 'z/', 'i/')):
            aliases.append(f"jx/{clean_id}")

    candidates: list[str] = []
    for alias in aliases:
        for ext in EXTENSIONS:
            if alias.startswith('img/'):
                candidates.append(f"{alias}{ext}")
            else:
                candidates.append(f"img/jx/{alias}{ext}")
                candidates.append(f"img/{alias}{ext}")

    seen: set[str] = set()
    for value in candidates:
        url = urljoin(base_url, value.lstrip('/'))
        if url in seen:
            continue
        seen.add(url)
        try:
            req = Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; JXLookDownloader/1.0)",
                "Referer": "https://volamidle.pages.dev/",
            })
            with urlopen(req, timeout=20):
                return url, value
        except Exception:
            continue

    fallback = f"img/jx/{clean_id}.webp" if clean_id else "img/jx/unknown.webp"
    return urljoin(base_url, fallback.lstrip('/')), fallback


def download_file(url: str, dest: Path) -> None:
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; JXLookDownloader/1.0)",
        "Referer": "https://volamidle.pages.dev/",
    })
    with urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download sprite assets declared in jxlook.js while preserving the original folder structure.")
    parser.add_argument("--base-url", default="https://volamidle.pages.dev/", help="Base URL of the site.")
    parser.add_argument("--jxlook-js", default="jxlook.js", help="Path to jxlook.js")
    parser.add_argument("--output-dir", default="assets", help="Root output directory.")
    args = parser.parse_args()

    jxlook_path = Path(args.jxlook_js)
    if not jxlook_path.exists():
        raise FileNotFoundError(f"jxlook.js not found: {jxlook_path}")

    output_root = Path(args.output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    asset_ids = extract_asset_ids(jxlook_path)
    print(f"Found {len(asset_ids)} sprite IDs in {jxlook_path}")

    total = 0
    for asset_id in asset_ids:
        url, relative_path = resolve_live_url(args.base_url, asset_id)
        local_path = output_root / relative_path.lstrip("/")
        if local_path.exists():
            print(f"SKIP {relative_path}")
            continue
        try:
            download_file(url, local_path)
            total += 1
            print(f"OK   {relative_path}")
        except Exception as exc:  # pragma: no cover - runtime download failure
            print(f"FAIL {asset_id} -> {exc}")

    print(f"\nDone. Downloaded {total} new sprite files under {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
