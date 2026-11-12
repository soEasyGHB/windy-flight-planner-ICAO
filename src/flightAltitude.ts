/**
 * Altitude selection for the Windy plugin store.
 * Windy uses pressure levels (e.g. 250h) and, for range overlays, levelsRange.
 * Atmospheric conversion below is approximate ISA, not QNH-corrected altitude.
 */
export type WindyAltitudeMode = 'pressure' | 'range' | 'two-dimensional';
export type WindyAltitudePlan = {
  mode: WindyAltitudeMode;
  requestedFL: number;
  pressureLevel: string | null;
  levelsRange: string | null;
  note: string;
};

export interface WindyStoreLike {
  get(key: string): unknown;
  getAllowed?(key: string): unknown;
  set(key: string, value: unknown): boolean;
}

export const PRESSURE_LEVELS = ['975h','950h','925h','900h','850h','800h','700h','600h','500h','400h','300h','250h','200h','150h','10h'] as const;

export function flPressureHpa(fl: number): number {
  const metres = fl * 100 * .3048;
  return 1013.25 * Math.pow(Math.max(0.001, 1 - metres/44330.77), 5.25588);
}

function allowedStrings(values: unknown): string[] {
  return Array.isArray(values) ? values.filter((v):v is string => typeof v === 'string') : [];
}

export function nearestPressureLevel(fl: number, available: readonly string[] = PRESSURE_LEVELS): string | null {
  const pressure = flPressureHpa(fl);
  const candidates = available.filter(s => /^\d+h$/.test(s));
  if(!candidates.length) return null;
  return candidates.reduce((best, s) => Math.abs(parseInt(s,10)-pressure) < Math.abs(parseInt(best,10)-pressure) ? s : best);
}

/** FL350 => FL300–400 nominal band. Endpoints are approximate isobaric equivalents. */
export function desiredTurbulenceBand(fl: number): string {
  if(fl < 100) return 'surface-700h';
  if(fl < 300) return '700h-300h';
  if(fl <= 400) return '300h-200h';
  return '200h-150h';
}

const TWO_DIMENSIONAL = new Set(['thunder','rain','radar','cape','cloudtop','rainAccu','ptype']);
const PRESSURE_OVERLAYS = new Set(['wind','temp','rh','clouds','icing']);

export function planWindyAltitude(overlay: string, fl: number, availLevels: readonly string[] = PRESSURE_LEVELS, availRanges: readonly string[] = []): WindyAltitudePlan {
  if(!Number.isFinite(fl) || fl < 0 || fl > 600) throw Error('Эшелон вне поддерживаемого диапазона FL000–FL600');
  if(overlay === 'turbulence') {
    const desired=desiredTurbulenceBand(fl);
    // The range is selected exactly when Windy advertises it; otherwise keep
    // it as an attempt so the store can report whether it accepted the value.
    const range=availRanges.length && !availRanges.includes(desired) ? null : desired;
    return {mode:'range',requestedFL:fl,pressureLevel:nearestPressureLevel(fl,availLevels),levelsRange:range,
      note:range ? `Турбулентность: диапазон ${desired} (ближайший к FL${Math.round(fl)}).`:
      `Для FL${Math.round(fl)} диапазон ${desired} недоступен в выбранной модели/версии Windy.`};
  }
  if(TWO_DIMENSIONAL.has(overlay)) {
    const isRadar=overlay==='radar';
    return {mode:'two-dimensional',requestedFL:fl,pressureLevel:null,levelsRange:null,
      note:isRadar?'Радар показывает наблюдаемые осадки, без фильтрации по эшелону.':
      `Слой «${overlay}» не поддерживает подтверждённую фильтрацию по FL${Math.round(fl)}; отображается карта явлений по району.`};
  }
  if(PRESSURE_OVERLAYS.has(overlay)) {
    const nearest=nearestPressureLevel(fl,availLevels);
    return {mode:'pressure',requestedFL:fl,pressureLevel:nearest,levelsRange:null,
      note:nearest ? `FL${Math.round(fl)}: ближайший доступный изобарический уровень ${nearest}.`:
      `Для слоя «${overlay}» нет доступного уровня на FL${Math.round(fl)}.`};
  }
  return {mode:'two-dimensional',requestedFL:fl,pressureLevel:null,levelsRange:null,
    note:`Для слоя «${overlay}» нельзя подтвердить высотную фильтрацию по FL${Math.round(fl)}.`};
}

export type AltitudeApplyResult = WindyAltitudePlan & {accepted:boolean; actual:string|null};
export function applyWindyAltitude(store: WindyStoreLike, overlay: string, fl: number): AltitudeApplyResult {
  const levels=allowedStrings(store.get('availLevels'));
  const effectiveLevels=levels.length ? levels : [...PRESSURE_LEVELS];
  const permittedRanges=allowedStrings(store.getAllowed?.('levelsRange'));
  const plan=planWindyAltitude(overlay,fl,effectiveLevels,permittedRanges);
  if(plan.mode==='two-dimensional') return {...plan,accepted:true,actual:null};
  if(plan.mode==='range') {
    if(!plan.levelsRange) return {...plan,accepted:false,actual:String(store.get('levelsRange')??'')};
    const changed=store.set('levelsRange',plan.levelsRange);
    const actual=String(store.get('levelsRange')??'');
    const accepted=changed || actual===plan.levelsRange;
    return {...plan,accepted,actual,note:accepted?plan.note:
      `Windy не принял диапазон ${plan.levelsRange}. Сейчас: ${actual || 'нет данных'}.`};
  }
  if(!plan.pressureLevel) return {...plan,accepted:false,actual:null};
  const changed=store.set('level',plan.pressureLevel);
  const actual=String(store.get('level')??'');
  const accepted=changed||actual===plan.pressureLevel;
  return {...plan,accepted,actual,note:accepted?plan.note:
    `Windy не принял ${plan.pressureLevel}. Сейчас: ${actual||'нет данных'}.`};
}
