#!/usr/bin/env python3
"""Pull one authorized X-Plane ZIP from a public Drive folder into navdata-input.

Requires Python package gdown. Only expected earth_*.dat files are extracted;
no archive paths are written, and mismatched AIRAC is rejected by build_navdata.py.
"""
from __future__ import annotations
import os
import sys
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'earth_fix.dat', 'earth_nav.dat', 'earth_awy.dat'}


def main() -> None:
    url = os.environ.get('GDRIVE_NAVDATA_FOLDER_URL', '').strip()
    parsed = urlparse(url)
    if not url or parsed.scheme != 'https' or parsed.hostname not in ('drive.google.com', 'www.drive.google.com'):
        sys.exit('GDRIVE_NAVDATA_FOLDER_URL must be a public Google Drive folder HTTPS URL')
    try:
        import gdown
    except ImportError:
        sys.exit('Missing gdown: pip install gdown')
    with tempfile.TemporaryDirectory(prefix='windy-navdata-') as temp:
        tempdir = Path(temp)
        # All files are downloaded to a disposable directory.
        downloaded = gdown.download_folder(url=url, output=str(tempdir), quiet=False, remaining_ok=True)
        zips = sorted({Path(p) for p in (downloaded or []) if str(p).lower().endswith('.zip')})
        if len(zips) != 1:
            sys.exit(f'Expected exactly one ZIP in Drive folder, found {len(zips)}')
        archive = zips[0]
        with zipfile.ZipFile(archive) as zf:
            matches: dict[str,zipfile.ZipInfo] = {}
            for info in zf.infolist():
                name = Path(info.filename).name.lower()
                if name not in EXPECTED or info.is_dir():
                    continue
                if name in matches:
                    sys.exit(f'Duplicate file in navdata archive: {name}')
                if info.file_size > 75_000_000:
                    sys.exit(f'Navdata file exceeds 75 MB: {name}')
                if info.external_attr >> 16 & 0o170000 == 0o120000:
                    sys.exit(f'Symlinks are not allowed: {name}')
                matches[name] = info
            if set(matches) != EXPECTED:
                sys.exit(f'Archive is missing navdata files: {sorted(EXPECTED-set(matches))}')
            dest = ROOT / 'navdata-input'
            dest.mkdir(exist_ok=True)
            for name, info in matches.items():
                # Read into a safe path instead of extracting untrusted archive names.
                with zf.open(info) as inp, (dest/name).open('wb') as out:
                    while data := inp.read(1024 * 1024):
                        out.write(data)
                print(f'Extracted {name} ({info.file_size} bytes)')
    print('Done. Execute tools/build_navdata.py to validate cycle and convert.')


if __name__ == '__main__':
    main()
