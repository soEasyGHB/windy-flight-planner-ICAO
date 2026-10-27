#!/usr/bin/env python3
"""Safe public-folder Google Drive -> X-Plane ZIP -> GitHub navdata build.

No private Google credentials and no access to private Drive folders.
The Google Drive folder must contain EXACTLY one navdata ZIP OR exactly 3
matching earth_*.dat files, from the same AIRAC cycle. No partial writes on
fetch or validation failure, and no redundant commits for unchanged source.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {"earth_fix.dat", "earth_nav.dat", "earth_awy.dat"}
MAX_BYTES = 70 * 1024 * 1024  # each uncompressed .dat


def normalize_name(path):
    name = Path(path).name.lower()
    return name[:-4] if name.endswith('.dat.txt') else name


def folder_url(raw):
    # Do not accept arbitrary commands or attacker-controlled domains.
    match = re.fullmatch(
        r'https://drive\.google\.com/drive/(?:u/\d+/)?folders/([A-Za-z0-9_-]+)(?:[/?#].*)?',
        (raw or '').strip(),
    )
    if not match:
        raise ValueError('Укажи URL публичной папки Google Drive (https://drive.google.com/drive/folders/...).')
    return 'https://drive.google.com/drive/folders/' + match.group(1)


def locate_files(download_dir):
    all_files = [p for p in download_dir.rglob('*') if p.is_file()]
    zips = [p for p in all_files if p.suffix.lower() == '.zip']
    dats = [p for p in all_files if normalize_name(p.name) in REQUIRED]
    if len(zips) == 1 and len(dats) == 0:
        return zips[0], None
    if len(zips) == 0 and len(dats) == 3 and {normalize_name(p.name) for p in dats} == REQUIRED:
        return None, dats
    raise ValueError('В папке должен быть ровно один ZIP с earth_fix/nav/awy.dat ИЛИ ровно три earth_*.dat. Удалите старые версии.')


def stage_files(download_dir, stage_dir):
    archive, files = locate_files(download_dir)
    if archive:
        if archive.stat().st_size > 220 * 1024 * 1024:
            raise ValueError('ZIP превышает 220 MiB — проверь исходные файлы')
        with zipfile.ZipFile(archive) as z:
            found = {}
            for info in z.infolist():
                name = normalize_name(info.filename)
                if name in REQUIRED and not info.is_dir():
                    if name in found:
                        raise ValueError(f'Дублируется {name} внутри ZIP')
                    if info.file_size > MAX_BYTES:
                        raise ValueError(f'{name} больше 70 MiB после распаковки')
                    found[name] = info
            if set(found) != REQUIRED:
                raise ValueError('В ZIP отсутствуют '+', '.join(sorted(REQUIRED - set(found))))
            for name in sorted(REQUIRED):
                # zipfile.open reads only selected entries, no path traversal.
                with z.open(found[name]) as src, (stage_dir/name).open('wb') as dst:
                    shutil.copyfileobj(src, dst)
    else:
        for p in files:
            if p.stat().st_size > MAX_BYTES:
                raise ValueError(f'{p.name} превышает 70 MiB')
            shutil.copyfile(p, stage_dir/normalize_name(p.name))
    for name in REQUIRED:
        if (stage_dir/name).stat().st_size < 100:
            raise ValueError(f'{name} пустой или слишком короткий')


def fingerprint(stage_dir):
    digest = hashlib.sha256()
    for name in sorted(REQUIRED):
        digest.update(name.encode('ascii')+b'\0')
        with (stage_dir/name).open('rb') as f:
            for chunk in iter(lambda: f.read(1024*1024), b''):
                digest.update(chunk)
    return digest.hexdigest()


def sync(fetch=True, download_dir=None):
    url = folder_url(os.environ.get('GDRIVE_NAVDATA_FOLDER_URL')) if fetch else None
    with tempfile.TemporaryDirectory(prefix='windy-gdrive-') as temp:
        work = Path(temp)
        incoming = Path(download_dir) if not fetch else work/'download'
        incoming.mkdir(parents=True, exist_ok=True)
        if fetch:
            print('Downloading shared Google Drive folder via gdown...')
            subprocess.run([sys.executable, '-m', 'gdown', url, '-O', str(incoming)], check=True, timeout=900)
        stage = work/'navdata'
        stage.mkdir()
        stage_files(incoming, stage)
        sha = fingerprint(stage)
        current = ROOT/'public/navdata/manifest.json'
        if current.exists():
            try:
                meta = json.loads(current.read_text(encoding='utf-8'))
                if meta.get('status') == 'ready' and meta.get('source_sha256') == sha:
                    print('No changes: the three X-Plane files are identical to the published snapshot.')
                    return 'unchanged'
            except (json.JSONDecodeError, OSError):
                pass
        env = dict(os.environ, NAVDATA_INPUT_DIR=str(stage),
                   NAVDATA_SOURCE_SHA256=sha,
                   NAVDATA_SOURCE_LABEL='Google Drive public folder (processed by GitHub Actions)')
        subprocess.run([sys.executable, str(ROOT/'tools/build_navdata.py')], check=True, env=env, timeout=180)
        produced = json.loads(current.read_text(encoding='utf-8'))
        if produced.get('status') != 'ready' or produced.get('source_sha256') != sha:
            raise RuntimeError('Generated navdata manifest was not validated')
        print('New AIRAC snapshot ready:', produced['airac_cycle'],
              'points:', produced['points'], 'segments:', produced['airway_segments'])
        return 'updated'


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--test-folder':
        # Local tests only; GitHub Action always downloads the actual public URL.
        sync(fetch=False, download_dir=Path(sys.argv[2]))
    else:
        sync()
