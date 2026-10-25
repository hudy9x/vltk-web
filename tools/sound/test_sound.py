"""Integration checks using real FFmpeg; run: python3 -m unittest discover -s tools/sound."""
import array
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import wave

SCRIPT = Path(__file__).with_name('sound.py')


class SoundNormalizationTests(unittest.TestCase):
    def test_levels_and_safety(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, amplitude, flags, expected in [
                ('quiet', .02, [], -17),
                ('loud', .9, [], -17),
                ('override', .02, ['--target-db', '-20'], -20),
                ('unchanged', .01, ['--no-normalize'], -43),
                ('silence', 0, [], None),
                ('transient', .01, [], None),
            ]:
                samples = array.array('h', [int(32767 * amplitude * math.sin(2 * math.pi * 440 * i / 44100)) for i in range(44100)])
                if name == 'transient':
                    samples[22050] = 30000
                source = root / f'{name}-input.wav'
                with wave.open(str(source), 'wb') as stream:
                    stream.setparams((1, 2, 44100, 0, 'NONE', 'not compressed'))
                    stream.writeframes(samples.tobytes())
                result = subprocess.run([sys.executable, str(SCRIPT), str(source), '--format', 'wav',
                                         '--name', name, '--output', str(root)] + flags,
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                with wave.open(str(root / f'{name}.wav'), 'rb') as stream:
                    values = array.array('h', stream.readframes(stream.getnframes()))
                    self.assertEqual(len(values), 44100)
                peak = max(abs(x) for x in values) / 32768
                self.assertLessEqual(peak, 10 ** (-2.8 / 20))
                if expected is not None:
                    rms = math.sqrt(sum(x*x for x in values) / len(values)) / 32768
                    self.assertAlmostEqual(20 * math.log10(rms), expected, delta=.2)
                if name == 'silence':
                    self.assertEqual(peak, 0)
                if name == 'transient':
                    self.assertIn('Target mean not reached', result.stdout)
            invalid = subprocess.run([sys.executable, str(SCRIPT), str(source), '--target-db', 'nan'], capture_output=True)
            self.assertNotEqual(invalid.returncode, 0)
