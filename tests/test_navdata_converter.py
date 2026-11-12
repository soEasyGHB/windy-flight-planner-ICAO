"""Exercise the real X-Plane AWY1100 converter on a synthetic Y12 airway.
Uses temp files; never reads or publishes the user's AIRAC data.
"""
import csv
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    (base / 'tools').mkdir()
    (base / 'navdata-input').mkdir()
    shutil.copy2(root / 'tools' / 'build_navdata.py', base / 'tools' / 'build_navdata.py')
    hdr = 'I\n1100 Version - data cycle 2609, build 20260901, synthetic test\n'
    (base / 'navdata-input' / 'earth_fix.dat').write_text(hdr + '\n'.join([
        '48.000000 12.000000 FIRST EU 11 0 0',
        '48.500000 13.500000 MIDYY EU 11 0 0',
        '49.000000 15.000000 LASTX EU 11 0 0',
        '99',
    ]) + '\n')
    (base / 'navdata-input' / 'earth_nav.dat').write_text(hdr + '99\n')
    (base / 'navdata-input' / 'earth_awy.dat').write_text(hdr + '\n'.join([
        'FIRST EU 11 MIDYY EU 11 N 2 180 450 Y12',
        'MIDYY EU 11 LASTX EU 11 N 2 180 450 Y12',
        '99',
    ]) + '\n')
    subprocess.run([sys.executable, str(base / 'tools' / 'build_navdata.py')], check=True,
                   stdout=subprocess.DEVNULL)
    manifest = json.loads((base / 'public' / 'navdata' / 'manifest.json').read_text())
    with (base / 'public' / 'navdata' / 'airways.csv').open(newline='') as f:
        rows = list(csv.DictReader(f))
    assert manifest['airac_cycle'] == '2609'
    assert manifest['airway_segments'] == 2
    assert len(rows) == 4
    assert all(r['airway'] == 'Y12' for r in rows)
    assert manifest['skipped_airway_segments'] == 0
print('PASS: real X-Plane AWY1100 Y12 conversion and AIRAC consistency')
