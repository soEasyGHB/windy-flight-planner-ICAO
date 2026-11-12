/** Standalone, offline HTML brief. No Windy tiles or network requests are copied.
 * A personally saved screenshot can be embedded unchanged, with attribution.
 * Without the screenshot the route diagram is not a weather layer.
 */
import type {ParsedRoute,RoutePoint} from './navdb';
import type {WeatherRow} from './weather';

export type WeatherOverlayName = 'thunder'|'turbulence'|'rain'|'radar'|'wind'|'temp'|'icing'|'clouds'|'rh'|'cape'|'cloudtop';
export interface OfflineMapShot {
  dataUrl:string;
  filename:string;
}
export interface OfflineBriefOptions {
  route:ParsedRoute;
  routeText:string;
  overlay:WeatherOverlayName;
  model:string;
  mapTimeUtc:string;
  departureUtc:string;
  tasKt:number;
  fl:number;
  image:OfflineMapShot | null;
  forecastRows?:WeatherRow[];
  createdAtUtc:string;
}

export function escapeHtml(value:unknown):string {
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
const validPoint=(p:RoutePoint):boolean=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
function geoRouteSvg(route:ParsedRoute):string {
  const paths=route.segments.filter(s=>s.length>0).map(seg=>seg.filter(validPoint)).filter(s=>s.length);
  const flattened=paths.flat();
  if(!flattened.length)return '<p class="alert">Не осталось координат для построения схемы.</p>';
  // Keep the route near the dateline together instead of drawing a 360-degree jump.
  const origin=flattened[0].lon;
  const lon=(n:number)=>origin+((((n-origin)+540)%360)-180);
  let lo=Infinity,hi=-Infinity,low=Infinity,high=-Infinity;
  for(const point of flattened){
    const v=lon(point.lon);
    lo=Math.min(lo,v);hi=Math.max(hi,v);
    low=Math.min(low,point.lat);high=Math.max(high,point.lat);
  }
  const padX=Math.max(1.5,(hi-lo)*.12),padY=Math.max(1.5,(high-low)*.12);
  lo-=padX;hi+=padX;low-=padY;high+=padY;
  const width=1100,height=540,inset=35;
  const x=(n:number)=>inset+(lon(n)-lo)/Math.max(.0001,hi-lo)*(width-2*inset);
  const y=(n:number)=>height-inset-(n-low)/Math.max(.0001,high-low)*(height-2*inset);
  const lines=paths.filter(s=>s.length>1).map(seg=>`<polyline fill="none" stroke="#ff8d33" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" points="${seg.map(p=>`${x(p.lon).toFixed(2)},${y(p.lat).toFixed(2)}`).join(' ')}" />`).join('');
  // Explicitly named points only. Never label ATS-expanded synthetic vertices.
  const seen=new Set<string>();
  const labels=flattened.filter(p=>p.showLabel===true&&p.type!=='ATS'&&
    !seen.has(`${p.ident}/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`)&&
    (seen.add(`${p.ident}/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`),true))
    .map(p=>`<g><circle cx="${x(p.lon).toFixed(2)}" cy="${y(p.lat).toFixed(2)}" r="4" fill="#fff" stroke="#ec7b24" stroke-width="2"/><text x="${(x(p.lon)+8).toFixed(2)}" y="${(y(p.lat)-7).toFixed(2)}" class="point-label">${escapeHtml(p.ident)}</text></g>`).join('');
  const graticule=Array.from({length:9},(_,i)=>{
    const gx=(inset+i*(width-2*inset)/8).toFixed(2);
    const gy=(inset+i*(height-2*inset)/8).toFixed(2);
    return `<path d="M${gx} ${inset}V${height-inset} M${inset} ${gy}H${width-inset}" stroke="#dbe5ee" stroke-width="1"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="route-svg" role="img" aria-label="Схема координат маршрута без погодного слоя"><rect width="${width}" height="${height}" fill="#eef5f9" />${graticule}${lines}${labels}<text x="${inset}" y="${height-10}" fill="#4f6070" font-size="14">Схема в географических координатах, не карта Windy и не навигационный документ</text></svg>`;
}
function validatedShot(src:OfflineMapShot|null):string|null {
  if(!src)return null;
  if(!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(src.dataUrl))throw Error('Разрешены только изображения PNG, JPEG или WebP.');
  if(src.dataUrl.length>22_000_000)throw Error('Снимок карты слишком большой (максимум примерно 15 МБ).');
  return src.dataUrl;
}
function routeDetails(route:ParsedRoute):string {
  const tr=route.points.filter(p=>p.showLabel===true&&p.type!=='ATS'&&validPoint(p));
  const rows=tr.map((p,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(p.ident)}</td><td>${p.lat.toFixed(5)}</td><td>${p.lon.toFixed(5)}</td><td>${escapeHtml(p.source)}</td></tr>`).join('');
  return `<table><thead><tr><th>№</th><th>Пункт</th><th>Широта</th><th>Долгота</th><th>Источник</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Нет подписанных точек</td></tr>'}</tbody></table>`;
}
function weatherDetails(rows:WeatherRow[]|undefined):string {
  if(!rows?.length)return '<p class="subdued">Таблица высотного прогноза не включена: перед экспортом нажми «Получить профиль и открыть», если она нужна.</p>';
  const levels=[300,320,340,360,380,400];
  const body=rows.flatMap(w=>levels.map(level=>{
    const c=w.flightLevels[level];
    const fmt=(v:number|null|undefined)=>v===null||v===undefined?'—':String(v);
    return `<tr><td>${escapeHtml(w.sample.label)}</td><td>${escapeHtml(w.sample.eta.toISOString().slice(0,16).replace('T',' '))}</td><td>FL${level}</td><td>${fmt(c?.windDir)}° / ${fmt(c?.windKt)} kt</td><td>${fmt(c?.temp)}</td><td>${fmt(c?.isaDeviationC)}</td></tr>`;
  })).join('');
  return `<p class="subdued">Расчётные ETA и ветер/температура по уровням Open-Meteo NOAA GFS (модель карты Windy может отличаться). Тропопауза оценена по температуре и модельным геопотенциальным высотам того же GFS. Источник: Open-Meteo (CC BY 4.0). Время вычислено по постоянной TAS без ветровой поправки.</p><table><thead><tr><th>Точка</th><th>ETA UTC</th><th>Уровень</th><th>Ветер</th><th>T °C</th><th>ISA Δ °C</th></tr></thead><tbody>${body}</tbody></table>`;
}
/** Create a completely self-contained file for browser use without internet. */
export function buildOfflineBrief(opt:OfflineBriefOptions):string {
  const shot=validatedShot(opt.image);
  const hasRoute=opt.route.segments.some(s=>s.length>=2);
  if(!hasRoute)throw Error('Для отчёта нужен хотя бы один маршрутный участок с двумя точками.');
  const labels:Record<WeatherOverlayName,string>={thunder:'Грозы',turbulence:'Турбулентность',rain:'Осадки',radar:'Радар осадков',wind:'Ветер',temp:'Температура',icing:'Обледенение',clouds:'Облачность',rh:'Влажность',cape:'CAPE',cloudtop:'Верхняя граница облаков'};
  const kind=labels[opt.overlay];
  const integrity=opt.route.gaps.length||opt.route.unresolved.length||opt.route.airwayNames.length||opt.route.ambiguous.length
    ?`НЕПОЛНЫЙ/НЕОДНОЗНАЧНЫЙ МАРШРУТ. Разрывов: ${opt.route.gaps.length}; неизвестных точек: ${opt.route.unresolved.length}; неподтверждённых ATS: ${opt.route.airwayNames.length}; неоднозначных точек: ${opt.route.ambiguous.length}. Не используйте для навигации.`
    :'Маршрут восстановлен по загруженной базе. Актуальность AIRAC и ограничения воздушного пространства самостоятельно не проверялись.';
  const image=shot?`<figure><img class="weather-screenshot" src="${shot}" alt="Предоставленный пользователем снимок Windy: ${kind}"/><figcaption>Снимок экрана, предоставленный пользователем (${escapeHtml(opt.image?.filename)}). Source: Windy.com. Погодный слой и время на снимке автоматически не проверяются.</figcaption></figure>`:
    `<div class="alert">Снимок Windy не приложен. Ниже только схема линии маршрута — <b>грозы и турбулентность на ней НЕ показаны.</b></div>`;
  const sourceNote=shot?'Снимок Windy (из файла пользователя)':'Без снимка Windy';
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flight Route Analyzer — офлайн-отчёт — ${escapeHtml(kind)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#192b38;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.report{max-width:1150px;margin:auto;background:#fff;padding:30px 36px}.actions{display:flex;gap:8px;justify-content:flex-end;margin-bottom:14px}button{padding:8px 13px;background:#1c69a7;color:#fff;border:0;border-radius:6px;cursor:pointer}h1{margin:0 0 4px;font-size:25px}h2{margin:28px 0 9px;font-size:19px}.subdued{color:#526779;font-size:12px}.head-row{border-bottom:3px solid #0b679a;padding-bottom:12px}.chips{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}.chip{background:#e7f2fa;border-radius:5px;padding:6px 10px;font-size:12px}.alert{background:#fff1df;border-left:4px solid #d78029;color:#663c0d;padding:12px;margin:12px 0}.weather-screenshot{display:block;max-width:100%;width:100%;height:auto;border-radius:6px;border:1px solid #cad7e2}figure{margin:10px 0}figcaption{font-size:11px;color:#526779;margin-top:6px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{text-align:left;border:1px solid #cad7e2;padding:5px 8px}thead th{background:#e9eff5}.table-wrap{overflow-x:auto}.route-svg{display:block;width:100%;height:auto;border:1px solid #b8cedb;border-radius:6px}.point-label{font-size:12px;fill:#202f3c;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}.foot{margin-top:35px;border-top:1px solid #cad7e2;padding-top:12px;font-size:11px;color:#526779}.wrap{overflow-wrap:anywhere;word-break:normal}
@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff;color:#000}.report{max-width:none;padding:0}.actions{display:none}.chips{margin:8px 0}.weather-screenshot{max-height:160mm;object-fit:contain}tr,figure,.route-svg{break-inside:avoid}h2{break-after:avoid}table{font-size:9px}}
</style></head><body><main class="report">
<div class="actions"><button onclick="window.print()">Печать / сохранить PDF</button></div>
<header class="head-row"><h1>Flight Route Analyzer — офлайн-отчёт</h1><div class="subdued">Предварительный обзор маршрута и погоды • Создан: ${escapeHtml(opt.createdAtUtc)} UTC • ${sourceNote}</div></header>
<div class="chips"><span class="chip">Слой: ${escapeHtml(kind)}</span><span class="chip">Модель Windy: ${escapeHtml(opt.model.toUpperCase())}</span><span class="chip">Время Windy: ${escapeHtml(opt.mapTimeUtc)} UTC</span><span class="chip">ETD: ${escapeHtml(opt.departureUtc)} UTC</span><span class="chip">TAS: ${escapeHtml(opt.tasKt)} kt</span><span class="chip">FL${escapeHtml(opt.fl)}</span><span class="chip">Маршрут: ${Math.round(opt.route.distanceNm)} NM (подтверждённые отрезки)</span></div>
<p class="subdued wrap"><b>Исходный OFP:</b> ${escapeHtml(opt.routeText)}</p>
<div class="alert">${escapeHtml(integrity)} Отчёт не является сертифицированным метеобрифингом. Нельзя использовать в качестве навигационного документа, SIGMET, карт SIGWX или прогноза опасной погоды.</div>
<h2>Карта с погодным слоем — ${escapeHtml(kind)}</h2>${image}
<h2>Схема и координаты маршрута</h2>${geoRouteSvg(opt.route)}
<h2>Именованные пункты плана</h2><div class="table-wrap">${routeDetails(opt.route)}</div>
<h2>Дополнительный прогноз по уровням FL300–FL400</h2><div class="table-wrap">${weatherDetails(opt.forecastRows)}</div>
<footer class="foot">Source: Windy.com — только приложенный снимок. Модельные данные таблицы: Open-Meteo (если загружены). Скриншот не содержит обновляемых погодных данных, а HTML целиком автономен и не загружает данные из сети. Дата прогноза ограничена временем, показанным на снимке. Не заменяет официальный предполётный брифинг.</footer>
</main></body></html>`;
}
