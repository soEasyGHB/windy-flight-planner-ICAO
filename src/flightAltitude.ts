/**
 * Altitude selection for the Windy plugin store.
 * Windy uses pressure levels (e.g. 250h) and, for range overlays, levelsRange.
 * Atmospheric conversion below is approximate ISA, not QNH-corrected altitude.
 */
export const DEFAULT_CRUISE_FL = 350;
// Approx. FL300–FL386 in ISA; closest Windy range to FL300–FL390.
export const DEFAULT_TURBULENCE_RANGE = '300h-200h';
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
  set(key: string, value: unknown): unknown;
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

/** FL350 => 300h–200h, approximately FL300–FL386 in ISA. */
export function desiredTurbulenceBand(fl: number): string {
  if(fl < 100) return 'surface-700h';
  if(fl < 300) return '700h-300h';
  if(fl <= 400) return DEFAULT_TURBULENCE_RANGE;
  return '200h-150h';
}

const TWO_DIMENSIONAL = new Set(['thunder','rain','radar','cape','cloudtop','rainAccu','ptype']);
const PRESSURE_OVERLAYS = new Set(['wind','temp','rh','clouds','icing']);

export function planWindyAltitude(overlay: string, fl: number, availLevels: readonly string[] = PRESSURE_LEVELS, availRanges: readonly string[] = []): WindyAltitudePlan {
  if(!Number.isFinite(fl) || fl < 0 || fl > 600) throw Error('Эшелон вне поддерживаемого диапазона FL000–FL600');
  if(overlay === 'turbulence') {
    const desired=desiredTurbulenceBand(fl);
    // Always attempt the range even if getAllowed() is stale immediately after
    // changing overlays. Windy can rebuild availLevels asynchronously.
    const available = !availRanges.length || availRanges.includes(desired);
    return {mode:'range',requestedFL:fl,pressureLevel:nearestPressureLevel(fl,availLevels),levelsRange:desired,
      note:available
        ? `Турбулентность: диапазон ${desired} (для FL${Math.round(fl)}).`
        : `Запрошен диапазон ${desired}; Windy пока не сообщает его как доступный.`};
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

export type AltitudeApplyResult = WindyAltitudePlan & {
  accepted: boolean;
  actual: string | null;
  actualLevel?: string | null;
  rangeAccepted?: boolean;
  pressureAccepted?: boolean;
};

function readValue(store: WindyStoreLike, key: string): string | null {
  try {
    const raw=store.get(key);
    return raw===null || raw===undefined ? null : String(raw);
  } catch(_err) { return null; }
}

/** A store.set() return value is not a reliable confirmation of map state. */
function writeAndVerify(store: WindyStoreLike, key: string, value: string): {actual:string|null; accepted:boolean} {
  try { store.set(key, value); }
  catch(_err) { /* The caller will report the actual value below. */ }
  const actual=readValue(store,key);
  return {actual,accepted:actual===value};
}

export function applyWindyAltitude(store: WindyStoreLike, overlay: string, fl: number): AltitudeApplyResult {
  const levels=allowedStrings(store.get('availLevels'));
  const effectiveLevels=levels.length ? levels : [...PRESSURE_LEVELS];
  let permittedRanges:string[]=[];
  try { permittedRanges=allowedStrings(store.getAllowed?.('levelsRange')); }
  catch(_err) { /* getAllowed can lag behind the overlay transition. */ }
  const plan=planWindyAltitude(overlay,fl,effectiveLevels,permittedRanges);
  if(plan.mode==='two-dimensional') return {...plan,accepted:true,actual:null};
  if(plan.mode==='range') {
    if(!plan.levelsRange) return {...plan,accepted:false,actual:readValue(store,'levelsRange')};
    // Windy's newer turbulence UI may consume level in addition to levelsRange.
    // Set center level first, then the actual range last. Neither is invented:
    // both are valid @windy/store fields.
    const pressure=plan.pressureLevel ? writeAndVerify(store,'level',plan.pressureLevel) : null;
    const range=writeAndVerify(store,'levelsRange',plan.levelsRange);
    const note=range.accepted
      ? `Турбулентность: на карте установлен ${plan.levelsRange} (около FL300–FL386 по ISA).`
      : `Windy не подтвердил ${plan.levelsRange} (сейчас ${range.actual??'неизвестно'}).` +
        (pressure?.accepted ? ` Отдельный уровень ${plan.pressureLevel} установлен; диапазон проверить вручную.` :
          ` Диапазон может быть недоступен для этой модели/версии Windy.`);
    return {...plan,accepted:range.accepted,actual:range.actual,actualLevel:pressure?.actual??readValue(store,'level'),
      rangeAccepted:range.accepted,pressureAccepted:pressure?.accepted??false,note};
  }
  if(!plan.pressureLevel) return {...plan,accepted:false,actual:readValue(store,'level')};
  const result=writeAndVerify(store,'level',plan.pressureLevel);
  return {...plan,accepted:result.accepted,actual:result.actual,actualLevel:result.actual,note:result.accepted?plan.note:
    `Windy не подтвердил ${plan.pressureLevel}. Сейчас: ${result.actual||'нет данных'}.`};
}
