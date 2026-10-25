#!/usr/bin/env python3
"""Normalize and atomically replace the audio asset of an already mapped skill."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def replace_sfx(source, skill_id, root=ROOT, dry_run=False):
    source = Path(source).expanduser().resolve(strict=True)
    if not source.is_file() or skill_id <= 0:
        raise ValueError('Source must be a file and skill ID must be positive')
    table = (root / 'src/client/data/audio-tables-01.js').read_text()
    block = re.search(r'window\.JS\["skill"\]\s*=\s*\{([^}]+)\}', table)
    mappings = re.findall(r'^\s*' + str(skill_id) + r'\s*:\s*"([^"]+)"', block[1] if block else '', re.M)
    if len(mappings) != 1:
        raise ValueError(f'Skill {skill_id} must have exactly one SFX mapping in audio-tables-01.js; register the skill and its playback hook first')
    url = urlsplit(mappings[0])
    relative = Path(url.path)
    if url.scheme or url.netloc or relative.is_absolute() or '..' in relative.parts or not relative.parts or relative.parts[0] != 'snd':
        raise ValueError('Only local snd/ assets can be replaced')
    sound_dir = (root / 'public/snd').resolve()
    destination = (root / 'public' / relative).resolve()
    if not destination.is_relative_to(sound_dir):
        raise ValueError('Destination escapes public/snd')
    codecs = {
        '.m4a': ['-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart'],
        '.ogg': ['-c:a', 'libopus', '-b:a', '48k'],
        '.mp3': ['-c:a', 'libmp3lame', '-b:a', '96k'],
        '.wav': ['-c:a', 'pcm_s16le'],
    }
    if destination.suffix not in codecs:
        raise ValueError(f'Unsupported mapped audio extension: {destination.suffix}')
    # Do not silently change another skill that shares a stock asset.
    shared = re.findall(r'^\s*(\d+)\s*:\s*"([^"]+)"', block[1], re.M)
    owners = [key for key, path in shared if urlsplit(path).path == url.path and int(key) != skill_id]
    if owners:
        raise ValueError(f'Asset is shared with skills {", ".join(owners)}; assign a dedicated SFX path first')
    print(f'Skill {skill_id}: {source} -> {destination}')
    if dry_run:
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Stage next to destination, so rename is atomic on this filesystem.
    with tempfile.TemporaryDirectory(prefix='.sfx-', dir=destination.parent) as folder:
        stage = Path(folder)
        subprocess.run([sys.executable, str(Path(__file__).with_name('sound.py')), str(source),
                        '--mono', '--format', 'wav', '--name', 'normalized', '--output', str(stage)], check=True)
        encoded = stage / ('ready' + destination.suffix)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
                        '-i', str(stage / 'normalized.wav'), '-map', '0:a:0', '-vn', '-ac', '1',
                        '-ar', '48000' if destination.suffix == '.ogg' else '44100',
                        *codecs[destination.suffix], str(encoded)], check=True)
        subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
                        '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', str(encoded)],
                       check=True, stdout=subprocess.DEVNULL)
        if destination.exists():
            backups = root / 'tools/sound/output/backups'
            backups.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            backup = backups / f'{skill_id}-{stamp}-{destination.name}'
            shutil.copy2(destination, backup)
            print(f'Backup: {backup}')
        encoded.replace(destination)
    print('Updated. Hard reload the game (Cmd+Shift+R) to clear the decoded audio cache.')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Cut audio file, preferably WAV')
    parser.add_argument('--skill', type=int, required=True, help='Existing skill SFX mapping ID')
    parser.add_argument('--dry-run', action='store_true', help='Show destination without writing')
    args = parser.parse_args()
    try:
        replace_sfx(args.source, args.skill, dry_run=args.dry_run)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Error: {error}\n')
