#!/usr/bin/env python3
"""Project-wide asset downloader built on dedicated per-source tools.

This script does not re-implement asset scanning logic. Instead it orchestrates the
specialized scripts that already handle each asset family correctly:
- CSS assets
- data.js assets
- sw.js assets
- jxlook.js sprites
- app.js sound/music assets
"""

from __future__ import annotations

import argparse
import sys
from importlib import import_module
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))


def run_module(module_name: str, extra_args: list[str]) -> int:
    original_argv = sys.argv[:]
    try:
        sys.argv = [module_name, *extra_args]
        module = import_module(module_name)
        return int(module.main())
    finally:
        sys.argv = original_argv


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download all project assets by delegating to the dedicated asset-specific tools."
    )
    parser.add_argument("--base-url", default="https://volamidle.pages.dev/", help="Base URL of the site.")
    parser.add_argument("--output-dir", default="assets", help="Root folder for downloaded assets.")
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Legacy compatibility flag. Individual tools already handle their own per-source downloads.",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output_root = root / args.output_dir
    output_root.mkdir(parents=True, exist_ok=True)

    print("[PROJECT] Starting project-wide asset download using dedicated tools...", flush=True)

    phases = [
        (
            "download_css_assets",
            ["--base-url", args.base_url, "--output-dir", args.output_dir],
        ),
        (
            "download_data_assets",
            [
                "--base-url",
                args.base_url,
                "--data-js",
                str(root / "data.js"),
                "--output-dir",
                args.output_dir,
            ],
        ),
        (
            "download_sw_assets",
            [
                "--base-url",
                args.base_url,
                "--sw-js",
                str(root / "sw.js"),
                "--output-dir",
                args.output_dir,
            ],
        ),
        (
            "download_jxlook_assets",
            [
                "--base-url",
                args.base_url,
                "--jxlook-js",
                str(root / "jxlook.js"),
                "--output-dir",
                args.output_dir,
            ],
        ),
        (
            "download_volamidle_snd",
            ["--base-url", args.base_url, "--output-dir", args.output_dir],
        ),
    ]

    for module_name, extra_args in phases:
        print(f"[PHASE] Running {module_name} ...", flush=True)
        code = run_module(module_name, extra_args)
        if code != 0:
            print(f"[PHASE] {module_name} failed with exit code {code}", flush=True)
            return code

    print(f"[PROJECT] Done. Asset tree saved under {output_root}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
