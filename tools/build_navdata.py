#!/usr/bin/env python3
"""Convert user-supplied, redistributable X-Plane nav files to static Windy CSV.
Supports XP10 legacy and XPFIX/XPAWY 1100/1101, basic NAV; no procedure/FL validation.
"""
import csv, json, os, re, sys, zipfile, hashlib
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
IN=Path(os.environ.get('NAVDATA_INPUT_DIR', str(ROOT/'navdata-input')))
OUT=ROOT/'public/navdata'
OUT.mkdir(parents=True,exist_ok=True)

def parsed_rows(text):
    raw=text.splitlines()
    header=' '.join(raw[:3])
    cycle=re.search(r'data\s+cycle\s+(\d{4})',header,re.I)
    data=[line.split() for line in raw if line.strip() and not line.startswith(('#',';')) and line.strip() not in ('I','A','99') and not re.match(r'^\d{3,4}\s+Version\b',line)]
    return data, (cycle.group(1) if cycle else None), raw[:3]

def load_sources():
    archives=sorted(IN.glob('*.zip'))
    if archives:
        if any((IN/n).exists() for n in ('earth_fix.dat','earth_nav.dat','earth_awy.dat')):
            raise SystemExit('Смешаны ZIP и .dat. Удали старые .dat либо архив перед обновлением.')
        if len(archives)>1:
            raise SystemExit('Оставь один ZIP в navdata-input. Удали старые архивы.')
        with zipfile.ZipFile(archives[0]) as z:
            wanted={}
            for info in z.infolist():
                n=info.filename.replace('\\','/').split('/')[-1].lower()
                if n.endswith('.dat.txt'): n=n[:-4]
                elif n.endswith('.txt'): n=n[:-4]+'.dat'
                if n in ('earth_fix.dat','earth_nav.dat','earth_awy.dat'):
                    if n in wanted:raise SystemExit(f'Повторяется файл {n} внутри ZIP')
                    if info.file_size>70*1024*1024:raise SystemExit(f'{n} слишком большой')
                    wanted[n]=info
            missing={'earth_fix.dat','earth_nav.dat','earth_awy.dat'}-wanted.keys()
            if missing:raise SystemExit('В ZIP отсутствуют: '+', '.join(sorted(missing)))
            return {name:z.read(info).decode('utf-8-sig',errors='replace') for name,info in wanted.items()}
    names=['earth_fix.dat','earth_nav.dat','earth_awy.dat']
    missing=[n for n in names if not (IN/n).is_file()]
    if missing:raise SystemExit('Загрузи один ZIP или три .dat в navdata-input/: '+', '.join(missing))
    return {name:(IN/name).read_text(encoding='utf-8-sig',errors='replace') for name in names}

def valid(a,b):
    return -90<=a<=90 and -180<=b<=180

def make():
    files=load_sources()
    fixrows,cf,hf=parsed_rows(files['earth_fix.dat'])
    navrows,cn,hn=parsed_rows(files['earth_nav.dat'])
    awyrows,ca,ha=parsed_rows(files['earth_awy.dat'])
    source_desc=os.environ.get('NAVDATA_SOURCE_LABEL') or ('ZIP '+next(iter(IN.glob('*.zip'))).name if list(IN.glob('*.zip')) else 'three .dat files')
    declared=[x for x in (cf,cn,ca) if x]
    if 0<len(declared)<3:
        raise SystemExit(f'AIRAC metadata incomplete: FIX={cf}, NAV={cn}, AWY={ca}')
    if declared and any(x!=declared[0] for x in declared):
        raise SystemExit(f'AIRAC cycles differ: FIX={cf}, NAV={cn}, AWY={ca}. Do not mix.')
    point_list=[]; index={}; ident_index={}
    def add(ident,lat,lon,typ,reg='',kind='11'):
        ident=ident.upper(); reg=reg.upper(); lat=float(lat);lon=float(lon)
        if not (re.fullmatch(r'[A-Z0-9]{2,8}',ident) and valid(lat,lon)):return
        rec=(ident,round(lat,7),round(lon,7),typ)
        if rec not in seen:
            point_list.append(rec);seen.add(rec)
        key=(ident,reg,str(kind))
        if key not in index:index[key]=(lat,lon)
        ident_index.setdefault(ident,set()).add((lat,lon))
    seen=set()
    for r in fixrows:
        try:
            a=float(r[0]);b=float(r[1]);name=r[2]
            if valid(a,b):add(name,a,b,'FIX',r[4] if len(r)>4 else '', '11' if len(r)>3 and r[3]=='ENRT' else 'terminal')
        except (ValueError,IndexError):continue
    for r in navrows:
        try:
            typ=int(r[0]);a=float(r[1]);b=float(r[2])
            if typ not in (2,3,12,13) or len(r)<8 or not valid(a,b):continue
            kind='2' if typ==2 else '3'
            add(r[7],a,b,('NDB' if typ==2 else 'VOR/DME'),r[9] if len(r)>9 else '', kind if len(r)>8 and r[8]=='ENRT' else 'terminal')
        except (ValueError,IndexError):continue
    def lookup(name,reg,kind):
        key=(name.upper(),reg.upper(),kind)
        if key in index:return index[key]
        return None  # do not silently substitute a same-named navaid in a different region
    airway_rows=[]; dropped=0;edges=0
    for r in awyrows:
        try:
            if len(r)<11:
                dropped+=1;continue
            if r[2] in ('11','2','3') and r[5] in ('11','2','3') and r[6] in ('N','F','B'):
                # XPAWY1100/1101: ident region type ident region type direction low/high base top airway.
                a=lookup(r[0],r[1],r[2]);b=lookup(r[3],r[4],r[5]); names=r[10]
                fromname,toname=r[0],r[3]
            else:
                # X-Plane 10 legacy format is deliberately excluded: modern 11/12 required.
                dropped+=1;continue
            if not a or not b or not (valid(*a) and valid(*b)):
                dropped+=1;continue
            if a==b:continue
            for name in names.split('-'):
                if not re.fullmatch(r'[A-Z0-9]{2,8}',name):continue
                edgeid=f'e{edges:08d}';edges+=1
                airway_rows.append((name,edgeid,0,round(a[0],7),round(a[1],7)))
                airway_rows.append((name,edgeid,1,round(b[0],7),round(b[1],7)))
        except (ValueError, IndexError):dropped+=1
    if not point_list or not airway_rows:
        raise SystemExit(f'No valid points or airways converted. points={len(point_list)}, airway vertices={len(airway_rows)}')
    def write(name,header,records):
        path=OUT/name
        with path.open('w',newline='',encoding='utf-8') as f:
            w=csv.writer(f);w.writerow(header);w.writerows(records)
    write('points.csv',['ident','latitude_deg','longitude_deg','type'],sorted(point_list))
    write('airways.csv',['airway','segment','seq','latitude_deg','longitude_deg'],airway_rows)
    meta={'status':'ready','generated_utc':datetime.now(timezone.utc).isoformat(),
          'airac_cycle':declared[0] if declared else None,'points':len(point_list),
          'airway_segments':edges,'skipped_airway_segments':dropped,
          'source':f'User-supplied X-Plane navdata ({source_desc}; verify license and AIRAC)',
          'source_sha256':os.environ.get('NAVDATA_SOURCE_SHA256',''),
          'warning':'Visualization only; no direction/altitude/NOTAM validation or certified navigation'}
    (OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(meta,indent=2))

if __name__=='__main__':make()
