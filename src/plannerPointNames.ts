/**
 * Optional labels for named flight-plan fixes while the Windy native route planner
 * is open. The actual route geometry is managed by the caller, never by this file.
 * Compatible with Windy's constructor-based Leaflet adapter.
 */

declare const L: {
  Marker: new (position: [number, number], options?: Record<string, unknown>) => {
    addTo(map: unknown): unknown;
  };
  DivIcon: new (options?: Record<string, unknown>) => unknown;
};

type NamedPoint = {
  lat: number;
  lon: number;
  ident: string;
};

type MapWithLayers = {
  removeLayer(layer: unknown): void;
};

let activeMarkers: unknown[] = [];
let activeMap: MapWithLayers | null = null;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char] || char);
}

function normalizePoint(value: unknown): NamedPoint | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.showLabel === false || item.synthetic === true || item.isAirwayVertex === true) return null;

  const loc = item.point && typeof item.point === 'object'
    ? item.point as Record<string, unknown> : item;
  const coords = Array.isArray(item.coordinates) ? item.coordinates : null;
  const lat = Number(loc.lat ?? loc.latitude ?? (coords && coords[0]));
  const lon = Number(loc.lon ?? loc.lng ?? loc.longitude ?? (coords && coords[1]));
  const ident = String(item.ident ?? item.label ?? item.name ?? loc.ident ?? loc.label ?? loc.name ?? '').trim();
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  // Ignore generated internal airway vertices, e.g. M56-2 or G242-4.
  if (!ident || /^(?:[A-Z]{1,3}\d{1,4}|[A-Z0-9]{1,6})-\d+$/i.test(ident)) return null;
  return {lat, lon, ident: ident.slice(0, 20)};
}

/** Remove any labels previously installed by this helper. Safe to call repeatedly. */
export function clearPlannerPointNames(): void {
  const currentMap = activeMap;
  const markers = activeMarkers;
  activeMarkers = [];
  activeMap = null;
  if (!currentMap) return;
  for (const marker of markers) {
    try { currentMap.removeLayer(marker); }
    catch (error) { console.warn('Windy: planner label cleanup failed', error); }
  }
}

/**
 * Show names of real waypoints in the native Windy planner. All parameters are
 * intentionally loosely typed to avoid coupling to undocumented Windy internals.
 * Returns a cleanup callback for the existing caller's error handler.
 */
export function installPlannerPointNames(
  map: MapWithLayers,
  _broadcast: unknown,
  points: unknown
): () => void {
  clearPlannerPointNames();
  const actualPoints = Array.isArray(points) ? points : [];
  activeMap = map;
  const seen = new Set<string>();
  for (const raw of actualPoints) {
    const point = normalizePoint(raw);
    if (!point) continue;
    const key = `${point.ident}:${point.lat.toFixed(5)}:${point.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const label = escapeHtml(point.ident);
      const icon = new L.DivIcon({
        className: 'fr-planner-waypoint-label',
        iconSize: [90, 20],
        iconAnchor: [3, 10],
        html: `<span style="display:inline-block;white-space:nowrap;pointer-events:none;` +
          `padding:2px 5px;border:1px solid #ff853b;border-radius:4px;` +
          `background:rgba(20,25,30,.88);color:white;` +
          `font:600 12px/16px sans-serif;">${label}</span>`
      });
      const marker = new L.Marker([point.lat, point.lon], {
        icon, interactive: false, zIndexOffset: 10000
      });
      activeMarkers.push(marker.addTo(map));
    } catch (error) {
      // A label must not stop the Windy Route Planner from opening.
      console.warn('Windy: cannot display planner waypoint label', point.ident, error);
    }
  }
  return clearPlannerPointNames;
}
