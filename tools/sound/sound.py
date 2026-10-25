#!/usr/bin/env python3
"""Download a YouTube video and extract game audio using local FFmpeg."""
import argparse
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse


def sound_main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', help='YouTube URL or local video/audio file')
    parser.add_argument('--name', default='sfx', help='Output filename (without extension)')
    parser.add_argument('--start', type=float, default=0, help='Start in seconds')
    parser.add_argument('--end', type=float, help='End in seconds, relative to original source')
    parser.add_argument('--format', choices=['wav', 'ogg', 'both'], default='both')
    parser.add_argument('--mono', action='store_true', help='Mix down to mono')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'output')
    parser.add_argument('--target-db', type=float, help='Override target mean dBFS')
    parser.add_argument('--peak-db', type=float, help='Override sample peak ceiling dBFS')
    parser.add_argument('--no-normalize', action='store_true', help='Keep source volume')
    args = parser.parse_args()
    settings = json.loads(Path(__file__).with_name('settings.json').read_text())
    target_db = args.target_db if args.target_db is not None else settings['target_mean_dbfs']
    peak_db = args.peak_db if args.peak_db is not None else settings['peak_ceiling_dbfs']
    max_gain = settings['max_gain_db']
    silence_db = settings['silence_threshold_dbfs']
    for key, value, low, high in [('target', target_db, -60, 0), ('peak', peak_db, -20, 0),
                                   ('max gain', max_gain, 0, 40), ('silence', silence_db, -90, -40)]:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
            parser.error(f'{key} must be finite and between {low} and {high} dB')
    if target_db >= peak_db:
        parser.error('target mean must be below peak ceiling')
    if not math.isfinite(args.start) or args.start < 0:
        parser.error('--start must be finite and >= 0')
    if args.end is not None and (not math.isfinite(args.end) or args.end <= args.start):
        parser.error('--end must be finite and greater than --start')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', args.name):
        parser.error('--name must contain only letters, digits, underscores and hyphens')
    for executable in ('ffmpeg', 'ffprobe'):
        if not shutil.which(executable):
            parser.error(f'{executable} is missing from PATH')
    source = Path(args.source).expanduser()
    args.output = args.output.expanduser().resolve()
    if not source.is_file():
        url = urlparse(args.source)
        if url.scheme not in ('http', 'https') or url.hostname not in (
            'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
        ):
            parser.error('Provide a YouTube URL or an existing local media file')
        try:
            import yt_dlp
        except ImportError:
            parser.error('Install dependencies: python -m pip install -r tools/sound/requirements.txt')
        args.output.mkdir(parents=True, exist_ok=True)
        downloaded = []
        options = {
            'noplaylist': True,
            'format': 'bv*+ba/b',
            'outtmpl': str(args.output / 'source' / '%(id)s.%(ext)s'),
            'merge_output_format': 'mkv',
            'writeinfojson': True,
            'js_runtimes': {'node': {}},
            'post_hooks': [downloaded.append],
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            downloader.extract_info(args.source, download=True)
        if not downloaded:
            raise RuntimeError('Downloader did not return a completed media file')
        source = Path(downloaded[-1])
    source = source.resolve()
    duration = float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(source),
    ], text=True).strip())
    if args.start >= duration or (args.end is not None and args.end > duration):
        parser.error(f'Clip exceeds source duration ({duration:.3f}s)')
    args.output.mkdir(parents=True, exist_ok=True)
    formats = ['wav', 'ogg'] if args.format == 'both' else [args.format]
    destinations = [args.output / f'{args.name}.{fmt}' for fmt in formats]
    for destination in destinations:
        if destination.exists() or destination == source:
            parser.error(f'Refusing to overwrite {destination}; choose another --name or --output')
    trim = f'atrim=start={args.start}' + (f':end={args.end}' if args.end is not None else '')
    filters = [trim, 'asetpts=PTS-STARTPTS']
    if args.mono:
        filters.append('aformat=sample_fmts=s16:channel_layouts=mono')
    else:
        filters.append('aformat=sample_fmts=s16')
    gain = 0.0
    if not args.no_normalize:
        analysis = subprocess.run([
            'ffmpeg', '-hide_banner', '-nostdin', '-i', str(source), '-map', '0:a:0', '-vn',
            '-af', ','.join(filters + ['volumedetect']), '-f', 'null', '-',
        ], check=True, capture_output=True, text=True)
        means = re.findall(r'mean_volume: ([-\d.]+) dB', analysis.stderr)
        peaks = re.findall(r'max_volume: ([-\d.]+) dB', analysis.stderr)
        if not means or not peaks:
            raise RuntimeError('Could not measure clip audio levels')
        mean, peak = float(means[-1]), float(peaks[-1])
        if mean <= silence_db:
            print(f'Silent/near-silent clip ({mean:.1f} dBFS); leaving volume unchanged')
        else:
            gain = min(target_db - mean, peak_db - peak, max_gain)
            print(f'Normalize: mean {mean:.1f}, peak {peak:.1f} dBFS; gain {gain:+.1f} dB; '
                  f'predicted mean {mean + gain:.1f}, peak {peak + gain:.1f} dBFS')
            if mean + gain < target_db - .2:
                print('Target mean not reached: constrained by peak ceiling or max gain')
    filters.append(f'volume={gain}dB')
    for fmt, destination in zip(formats, destinations):
        command = ['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-nostdin', '-n',
                   '-i', str(source), '-af', ','.join(filters)]
        command += ['-map', '0:a:0', '-vn', '-ar', '44100' if fmt == 'wav' else '48000']
        if args.mono:
            command += ['-ac', '1']
        command += ['-c:a', 'pcm_s16le'] if fmt == 'wav' else ['-c:a', 'libopus', '-b:a', '128k']
        command += [str(destination)]
        subprocess.run(command, check=True)
        print(f'Created: {destination}')


if __name__ == '__main__':
    try:
        sound_main()
    except (RuntimeError, ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Error: {error}', file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
