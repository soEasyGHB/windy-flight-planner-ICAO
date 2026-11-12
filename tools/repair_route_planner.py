#!/usr/bin/env python3
"""Fix missing buildWindyPlannerRequest export without overwriting routePlanner.ts.
Safe to rerun. Creates a timestamp-free backup before changes.
"""
from pathlib import Path
import re
import shutil
import sys

p = Path('src/routePlanner.ts')
if not p.is_file():
    sys.exit('ERROR: run from project root. Missing src/routePlanner.ts')
code = p.read_text(encoding='utf-8')
name = 'buildWindyPlannerRequest'
# An explicit export already exists.
if re.search(rf'\bexport\s+(?:(?:async|default)\s+)*(?:function|const|let)\s+{name}\b', code) or re.search(rf'export\s*\{{[^}}]*\b{name}\b[^}}]*\}}', code, re.S):
    print('OK: buildWindyPlannerRequest is already exported; no change.')
    sys.exit(0)

# Preserve a pre-existing implementation if present but missing the export keyword.
match = re.search(rf'^(\s*)(?:(async)\s+)?function\s+{name}\s*\(', code, re.M)
if match:
    pos = match.start(0) + len(match.group(1))
    code = code[:pos] + 'export ' + code[pos:]
    how = 'exported existing function'
elif re.search(rf'^\s*(?:const|let)\s+{name}\b', code, re.M):
    m = re.search(rf'^(\s*)(?:const|let)\s+{name}\b', code, re.M)
    pos = m.start(0) + len(m.group(1))
    code = code[:pos] + 'export ' + code[pos:]
    how = 'exported existing variable'
elif re.search(rf'\bclass\s+{name}\b', code):
    sys.exit('ERROR: existing class with the same name. No files changed.')
else:
    code += r'''

/**
 * Compatibility adapter for the route-planner call in plugin.svelte v0.8.0.
 * IMPORTANT: Windy does not publish a supported API contract for injecting
 * points into its internal route planner. "params" is therefore best-effort,
 * NOT confirmation that Windy will accept the complete route.
 * The GPX exporter remains the reliable fallback.
 */
export function buildWindyPlannerRequest(
  parsed: {
    points: Array<{ident: string; lat: number; lon: number; showLabel?: boolean; synthetic?: boolean}>;
    segments?: Array<Array<{ident: string; lat: number; lon: number}>>;
    gaps?: unknown[];
    unresolved?: unknown[];
    airwayNames?: unknown[];
    ambiguous?: unknown[];
  },
  allowPartial = false
): {
  params: {points: Array<{lat: number; lon: number}>};
  mapPoints: Array<{ident: string; lat: number; lon: number}>;
  verticesSent: number;
  partial: boolean;
  from: string;
  to: string;
} {
  const valid = (p: {lat: number; lon: number}) => Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  const paths = (parsed.segments?.length ? parsed.segments : [parsed.points])
    .map(s => s.filter(valid)).filter(s => s.length >= 2);
  if (!paths.length) throw new Error('Нет непрерывного участка маршрута минимум из двух подтверждённых точек');
  const partial = paths.length !== 1 || !!(parsed.gaps?.length || parsed.unresolved?.length ||
    parsed.airwayNames?.length || parsed.ambiguous?.length);
  if (partial && !allowPartial) throw new Error('Маршрут неполный: экспорт полного маршрута невозможен');
  // The longest contiguous segment only. Never bridge unknown ATS geometry.
  const path = paths.reduce((best, leg) => leg.length > best.length ? leg : best, paths[0]);
  const named = parsed.points.filter(p => valid(p) && p.showLabel !== false &&
    p.synthetic !== true && !/-\d+$/i.test(p.ident));
  const seen = new Set<string>();
  const mapPoints = named.filter(p => {
    const id = `${p.ident}:${p.lat.toFixed(5)}:${p.lon.toFixed(5)}`;
    if (seen.has(id)) return false;
    seen.add(id); return true;
  }).map(p => ({ident:p.ident,lat:p.lat,lon:p.lon}));
  const points = path.map(p => ({lat:p.lat,lon:p.lon}));
  return {
    params: {points},
    mapPoints,
    verticesSent: points.length,
    partial,
    from: path[0].ident,
    to: path[path.length - 1].ident,
  };
}
'''
    how = 'added compatibility adapter'
backup = p.with_suffix('.ts.before-route-fix.bak')
if not backup.exists(): shutil.copy2(p, backup)
p.write_text(code, encoding='utf-8')
print(f'OK: {how}. Backup: {backup}')
