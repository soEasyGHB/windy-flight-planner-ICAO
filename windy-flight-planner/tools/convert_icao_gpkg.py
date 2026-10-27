#!/usr/bin/env python3
"""Transform *licensed* ICAO GPKG points/airway lines into CSVs accepted by this plugin.
Do not share proprietary dataset or generated extracts unless ICAO license allows it.
Requires: pip install geopandas fiona shapely pyogrio
Usage: python tools/convert_icao_gpkg.py path/to/data.gpkg --output output/
Optional: --ident-field FIX_NAME --airway-field ROUTE_DESIGNATOR
"""
import argparse
import csv
from pathlib import Path
import geopandas as gpd
import fiona

POINT_NAMES = ('ident','designator','identifier','icao_ident','icao_id','name','waypoint','fix_name','code','waypoint_name','navaid_id','name_txt')
AIRWAY_NAMES = ('airway','route','route_designator','route_ident','designator','name','airway_name','ats_route')

def find_col(columns, names, override=None):
    if override:
        matching = next((c for c in columns if c.lower() == override.lower()), None)
        if not matching: raise ValueError(f'No column {override}. Available: {list(columns)}')
        return matching
    return next((c for name in names for c in columns if c.lower().replace(' ','_') == name),None)

def line_parts(geom):
    if geom.geom_type == 'LineString': return [geom]
    if geom.geom_type == 'MultiLineString': return list(geom.geoms)
    return []

def export(file,out,ident_field=None,airway_field=None):
    out.mkdir(parents=True,exist_ok=True)
    point_file=out/'points.csv';airways_file=out/'airways.csv'
    pcount=acount=0
    with point_file.open('w',encoding='utf-8',newline='') as pf,airways_file.open('w',encoding='utf-8',newline='') as af:
        pw=csv.writer(pf);aw=csv.writer(af)
        pw.writerow(['ident','latitude_deg','longitude_deg','type'])
        aw.writerow(['airway','segment','seq','latitude_deg','longitude_deg'])
        for layer in fiona.listlayers(file):
            try:
                frame=gpd.read_file(file,layer=layer)
                if frame.empty:continue
                if frame.crs is None:
                    print(f'SKIP {layer}: missing CRS; cannot safely infer WGS84');continue
                frame=frame.to_crs('EPSG:4326')
                name_col=find_col(frame.columns,POINT_NAMES,ident_field) if ident_field else find_col(frame.columns,POINT_NAMES)
                airway_col=find_col(frame.columns,AIRWAY_NAMES,airway_field) if airway_field else find_col(frame.columns,AIRWAY_NAMES)
                layer_points=layer_lines=0
                for idx,row in frame.iterrows():
                    geom=row.geometry
                    if geom is None or geom.is_empty:continue
                    if geom.geom_type == 'Point' and name_col:
                        ident=str(row[name_col]).strip().upper()
                        if ident and ident != 'NAN':
                            pw.writerow([ident,round(geom.y,7),round(geom.x,7),layer]);pcount+=1;layer_points+=1
                    elif airway_col:
                        airway=str(row[airway_col]).strip().upper()
                        if airway and airway!='NAN':
                            for piece,segment in enumerate(line_parts(geom)):
                                if not segment.coords:continue
                                for seq,(lon,lat,*_) in enumerate(segment.coords):
                                    aw.writerow([airway,f'{layer}:{idx}:{piece}',seq,round(lat,7),round(lon,7)])
                                    acount+=1;layer_lines+=1
                print(f'{layer}: {layer_points} point fixes, {layer_lines} airway vertices')
            except Exception as ex:
                print(f'ERROR layer {layer}: {ex}')
    print(f'Export: {pcount} points → {point_file}; {acount} airway vertices → {airways_file}')

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('gpkg',type=Path);p.add_argument('--output',type=Path,default=Path('icao-export'))
    p.add_argument('--ident-field');p.add_argument('--airway-field')
    args=p.parse_args()
    export(args.gpkg,args.output,args.ident_field,args.airway_field)
