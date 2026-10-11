#!/usr/bin/env python3
"""Download CSS image/font assets from the Vo Lam Idle site while preserving the original path structure.

Example:
    python tools/download_css_assets.py
    python tools/download_css_assets.py --base-url https://volamidle.pages.dev/
    python tools/download_css_assets.py --css jx1ui2.css --output-dir assets
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


CSS_URL_RE = re.compile(r"url\((?:['\"])?([^'\")]+)(?:['\"])?\)|@import\s+(?:url\()?(?:['\"])?([^'\")]+)", re.IGNORECASE)


def find_css_files(root: Path) -> list[Path]:
    css_files = sorted(root.rglob("*.css"))
    if not css_files:
        raise FileNotFoundError(f"No .css files found under {root}")
    return css_files


def extract_css_asset_urls(css_file: Path, base_url: str, root: Path) -> list[str]:
    text = css_file.read_text(encoding="utf-8", errors="ignore")
    matches: list[str] = []
    for match in CSS_URL_RE.finditer(text):
        value = match.group(1) or match.group(2)
        if not value:
            continue
        cleaned = value.strip()
        if cleaned.startswith(("data:", "blob:", "#", "about:")):
            continue
        matches.append(cleaned)

    seen: set[str] = set()
    resolved: list[str] = []
    css_rel = css_file.relative_to(root).as_posix()
    css_base = urljoin(base_url, css_rel)

    for asset in matches:
        if asset.startswith(("http://", "https://", "//")):
            candidate = asset if asset.startswith("http") else "https:" + asset
        elif asset.startswith("/"):
            candidate = urljoin(base_url, asset)
        else:
            candidate = urljoin(css_base, asset)

        if candidate not in seen:
            seen.add(candidate)
            resolved.append(candidate)

    return resolved


def safe_local_path(asset_url: str) -> Path:
    parsed = urlparse(asset_url)
    path = parsed.path.lstrip("/")
    if not path:
        raise ValueError(f"Asset URL has no path: {asset_url}")
    return Path(path)


def download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; CSSDownloader/1.0)",
        "Referer": "https://volamidle.pages.dev/",
    })
    with urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download assets referenced by CSS files while preserving the original folder structure.")
    parser.add_argument("--base-url", default="https://volamidle.pages.dev/", help="Base URL of the site.")
    parser.add_argument("--css", nargs="*", default=None, help="Specific CSS files to scan. Defaults to all .css files in the workspace root.")
    parser.add_argument("--output-dir", default="assets", help="Root directory where CSS assets are saved. Example: assets/ui/jx1/flor.png")
    args = parser.parse_args()

    workspace_root = Path(__file__).resolve().parents[1]

    css_files: list[Path]
    if args.css:
        css_files = [Path(path) for path in args.css]
        for p in css_files:
            if not p.exists():
                raise FileNotFoundError(f"CSS file not found: {p}")
    else:
        css_files = find_css_files(workspace_root)

    output_root = workspace_root / args.output_dir
    seen_urls: set[str] = set()
    total = 0

    for css_file in css_files:
        for asset_url in extract_css_asset_urls(css_file, args.base_url, workspace_root):
            if asset_url in seen_urls:
                continue
            seen_urls.add(asset_url)
            local_path = output_root / safe_local_path(asset_url)
            try:
                download_file(asset_url, local_path)
                print(f"OK   {safe_local_path(asset_url).as_posix()}")
                total += 1
            except Exception as exc:  # pragma: no cover - runtime download failure
                print(f"FAIL {asset_url} -> {exc}")

    print(f"\nDone. Downloaded {total} CSS asset files under {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
