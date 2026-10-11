#!/usr/bin/env python3
"""Compatibility wrapper.

This script intentionally reuses the canonical, project-wide downloader already
implemented in download_project_assets.py instead of duplicating the asset scan
logic here.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from download_project_assets import main as project_main


if __name__ == "__main__":
    raise SystemExit(project_main())
