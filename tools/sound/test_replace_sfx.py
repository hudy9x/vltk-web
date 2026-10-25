import contextlib
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from replace_sfx import replace_sfx


class ReplaceSfxTests(unittest.TestCase):
    def test_replace_backup_dry_run_and_failed_conversion(self):
        with tempfile.TemporaryDirectory() as folder, contextlib.redirect_stdout(io.StringIO()):
            root = Path(folder)
            table = root / 'src/client/data/audio-tables-01.js'
            table.parent.mkdir(parents=True)
            table.write_text('window.JS["skill"] = {\n  1081: "snd/thunder.m4a",\n};')
            asset = root / 'public/snd/thunder.m4a'
            asset.parent.mkdir(parents=True)
            asset.write_bytes(b'original-audio')
            source = root / 'input.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2', str(source)], check=True)
            replace_sfx(source, 1081, root, dry_run=True)
            self.assertEqual(asset.read_bytes(), b'original-audio')
            self.assertFalse((root / 'tools/sound/output/backups').exists())
            replace_sfx(source, 1081, root)
            self.assertNotEqual(asset.read_bytes(), b'original-audio')
            backups = list((root / 'tools/sound/output/backups').iterdir())
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), b'original-audio')
            previous = asset.read_bytes()
            source.write_text('invalid audio')
            with self.assertRaises(subprocess.CalledProcessError):
                replace_sfx(source, 1081, root)
            self.assertEqual(asset.read_bytes(), previous)
            with self.assertRaises(ValueError):
                replace_sfx(source, 1080, root)
            table.write_text('window.JS["skill"] = {\n 1081: "snd/thunder.m4a",\n 372: "snd/thunder.m4a",\n};')
            with self.assertRaises(ValueError):
                replace_sfx(source, 1081, root)
            self.assertEqual(asset.read_bytes(), previous)
