<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content flightplanner">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>
  <p class="disclaimer">ПРОТОТИП. Не является сертифицированным средством планирования полётов. Только обзор погоды.</p>
  <label>Маршрут (ICAO / DCT / точки через пробел)</label>
  <textarea bind:value={routeText} rows="4" spellcheck="false" placeholder="EHAM DCT EDDF DCT LTFM DCT OMDB"></textarea>
  <div class="btnrow">
    <button type="button" class="primary" on:click={runRoute}>Построить маршрут</button>
    <button type="button" on:click={clearRoute}>Очистить</button>
  </div>
  <p class="info" aria-live="polite">{status}</p>
  {#if parsed}
    <div class="stats"><b>{parsed.points.length}</b> найдено точек · <b>{Math.round(parsed.distanceNm)} NM</b> (только подтверждённые участки)</div>
    {#if parsed.unresolved.length}<p class="warning">Неизвестные точки: {parsed.unresolved.join(', ')}. Линия неполная; не используйте её как маршрут.</p>{/if}
    {#if parsed.expandedAirways.length}<p class="info">Развёрнуты по импортированной геометрии ATS: {parsed.expandedAirways.join(', ')} (проверьте AIRAC/ограничения).</p>{/if}
    {#if parsed.airwayNames.length}<p class="warning">Трассы {parsed.airwayNames.join(', ')} пока НЕ разворачиваются в промежуточные точки. Неподтверждённые участки НЕ соединяются линией.</p>{/if}
    {#if parsed.ambiguous.length}<p class="warning">Повторяющиеся идентификаторы: {parsed.ambiguous.join(', ')}. Координаты выбраны приблизительно; проверьте.</p>{/if}
    {#if parsed.gaps.length}<p class="warning">Разрывы маршрута ({parsed.gaps.length}): {parsed.gaps.map(g=>`${g.from} → ${g.to}: ${g.reason} (${Math.round(g.distanceNm)} NM)`).join(' · ')}. Эти отрезки не отображаются и не входят в расчёт погоды.</p>{/if}
    {#if parsed.points.length > 0}
      <details><summary>Координаты по маршруту ({parsed.points.length})</summary>
        <div class="scrolltable"><table><thead><tr><th>Точка</th><th>Lat</th><th>Lon</th><th>Источник</th></tr></thead><tbody>
          {#each parsed.points as p}<tr><td>{p.ident}</td><td>{p.lat.toFixed(4)}</td><td>{p.lon.toFixed(4)}</td><td>{p.source}</td></tr>{/each}
        </tbody></table></div>
      </details>
    {/if}
  {/if}
  <hr />
  <h3>Windy: отображаемая погода</h3>
  <div class="twofields">
    <div><label>Слой Windy</label><select bind:value={overlay} on:change={setWeatherLayer}>
      <option value="wind">Ветер</option><option value="temp">Температура</option><option value="rh">Влажность</option>
      <option value="clouds">Облачность</option><option value="turbulence">Турбулентность (Windy)</option>
      <option value="icing">Обледенение (Windy)</option><option value="thunder">Грозы</option>
      <option value="cape">CAPE</option><option value="cloudtop">Верхняя граница облаков</option>
    </select></div>
    <div><label>Модель карты</label><select bind:value={model} on:change={setWeatherLayer}>
      <option value="ecmwf">ECMWF</option><option value="gfs">GFS</option>
    </select></div>
  </div>
  <div class="twofields">
    <div><label>Эшелон (FL)</label><input type="number" min="10" max="450" step="10" bind:value={fl} /></div>
    <div><label>Слой на уровне</label><button type="button" class="full" on:click={setWeatherLayer}>Показать FL{fl}</button></div>
  </div>
  <p class="small">Windy отображает ближайший доступный изобарический уровень (например FL350 ≈ 250 hPa). Для некоторых слоёв выбор уровня недоступен.</p>
  <hr />
  <h3>Прогноз по маршруту и высотам</h3>
  <p class="small">В этой части используется отдельный прогноз Open-Meteo, а не выбранная модель Windy. ETA приблизительное, без ветровой поправки.</p>
  <div class="twofields">
    <div><label>ETD, UTC</label><input type="datetime-local" bind:value={etdValue}/></div>
    <div><label>Условная TAS, kt</label><input type="number" min="100" max="700" bind:value={tas} /></div>
  </div>
  <div class="btnrow">
    <button type="button" class="primary" disabled={busy || !parsed || parsed.points.length<2 || parsed.gaps.length>0 || parsed.unresolved.length>0} on:click={analyze}>Анализ по высотам</button>
    <button type="button" disabled={!weather.length} on:click={downloadWeather}>CSV отчёт</button>
  </div>
  {#if weather.length}
    <h4>Параметры на FL{weatherFL} (ближайший уровень {weather[0].flPressure} hPa)</h4>
    <div class="scrolltable"><table><thead><tr><th>Место</th><th>ETA UTC</th><th>T °C</th><th>Ветер kt</th><th>RH %</th><th>Индикаторы*</th></tr></thead><tbody>
      {#each weather as w}
        <tr><td>{w.sample.label}<span class="muted"> · {Math.round(w.sample.distanceNm)}NM</span></td>
          <td>{w.sample.eta.toISOString().slice(11,16)}</td><td>{w.atFl?.temp ?? '—'}</td>
          <td>{w.atFl?.windKt ?? '—'}</td><td>{w.atFl?.rh ?? '—'}</td>
          <td class:flag={w.alerts.length>0}>{w.alerts.length?w.alerts.join('; '):'—'}</td></tr>
      {/each}
    </tbody></table></div>
    <h4>Вертикальный разрез: T °C / ветер kt</h4>
    <div class="scrolltable"><table><thead><tr><th>hPa ≈ FL</th>{#each weather as w}<th>{w.sample.label}</th>{/each}</tr></thead><tbody>
      {#each pressuresDescending as p}
      <tr><td>{p} ≈ FL{Math.round((44330.77*(1-Math.pow(p/1013.25,1/5.25588))/0.3048)/100)}</td>
        {#each weather as w}
          <td class:flag={w.levels[p].indicators.length>0} title={w.levels[p].indicators.join('; ')}>
            {w.levels[p].temp ?? '—'}° / {w.levels[p].windKt ?? '—'}kt {w.levels[p].indicators.length?'*':''}
          </td>
        {/each}</tr>
      {/each}
    </tbody></table></div>
    <p class="small">Данные прогноза: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0). Интерполяция вдоль маршрута и пороговые индикаторы — модификации в этом проекте.</p>
    <p class="small">* Индикаторы по упрощённым порогам: T от −20 до 0 °C и RH ≥80% (условия возможного обледенения); ветер ≥100 kt; CAPE &gt;1000 J/kg; разница скорости ветра ≥35 kt между соседними уровнями. Это <b>НЕ</b> прогноз фактического обледенения, CAT/турбулентности, гроз по трассе или опасных явлений по ICAO. Для решений используйте SIGMET, значимые карты, AIP, NOTAM и утверждённые источники.</p>
  {/if}
  <hr />
  <h3>Навигационная база X-Plane 11/12</h3>
  <p class="small">На iPad удобнее выбрать <b>один ZIP</b> с <code>earth_fix.dat</code>, <code>earth_nav.dat</code> и <code>earth_awy.dat</code> одного AIRAC. ZIP может содержать вложенные папки. Можно также выбрать три отдельных файла .dat или .txt. Данные остаются на устройстве.</p>
  <label for="xplane-files">Добавить ZIP или три файла X-Plane</label>
  <input id="xplane-files" type="file" multiple on:change={selectXPlaneFiles}/>
  <div class="btnrow"><button class="primary" type="button" disabled={busy || selectedXplaneFiles.length===0} on:click={importXPlane}>Импортировать X-Plane в Windy</button></div>
  {#if xplaneCycle}<p class="info">Локальный AIRAC: {xplaneCycle}; он не хранится на сервере Windy.</p>{/if}
  {#if xplaneWarnings.length}<p class="warning">{xplaneWarnings.join(' · ')}</p>{/if}
  <hr />
  <h3>Общая база через GitHub (необязательно)</h3>
  <label for="github-navdata">Ссылка на публичный GitHub-репозиторий (один раз)</label>
  <input id="github-navdata" type="url" bind:value={navdataUrl} placeholder="https://github.com/USER/windy-flight-planner" />
  <div class="btnrow">
    <button type="button" on:click={openGitHubUpload}>Открыть загрузку файлов GitHub</button>
    <button type="button" disabled={busy} class="primary" on:click={updateHosted}>Обновить базу из GitHub</button>
  </div>
  <p class="small">В GitHub можно загрузить один ZIP вместо трёх .dat. Нужно войти в аккаунт и подтвердить Commit changes. Браузерный плагин не может безопасно публиковать файлы в репозиторий без отдельной авторизации. GitHub Actions создаёт CSV из ZIP, затем нажми «Обновить базу из GitHub». Чтобы читать CSV без токена, репозиторий должен быть публичным.</p>
  <p class="warning">Не загружай платные или персонально лицензированные X-Plane/Navigraph/Jeppesen файлы в публичный GitHub без разрешения правообладателя. Для таких данных используй локальный импорт выше.</p>

  <p class="small">{pointTotal.toLocaleString('ru-RU')} записей · открытые источники: {loadedSources}/3 · импортировано: {imported} · трасс: {airways}. Загрузка открытых источников выполняется в браузере; интернет и CORS обязательны.</p>
  <label>Добавить собственный CSV навигационных точек</label>
  <input type="file" accept=".csv,text/csv" on:change={importFile}/>
  <p class="small">CSV: <code>ident,latitude_deg,longitude_deg,type</code> или экспорт воздушных трасс <code>airway,segment,seq,latitude_deg,longitude_deg</code>. Для GeoPackage (.gpkg) есть конвертер. Соблюдайте лицензию ICAO.</p>
  <button type="button" on:click={reloadSources}>Перезагрузить открытые данные</button>
  <p class="small">Открытые дополнительные источники неполные. X-Plane: геометрия ATS сегментов, без проверки направлений, высотных ограничений, действительности трассы, SID/STAR, NOTAM. Проверка AIRAC — только совпадение заголовков трёх файлов, не проверка актуальности.</p>
</section>
<script lang="ts">
  import bcast from '@windy/broadcast';
  import config from './pluginConfig';
  const {title} = config;
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { onMount,onDestroy } from 'svelte';
  import {loadDemo,loadOpenSources,importCsv,importAirwaysCsv,airwayCount,parseRoute,totalPoints,sourceCount,userPointCount,loadGithubSnapshot,loadLocalXPlaneSnapshot,githubUploadUrl} from './navdb';
  import {convertXPlane} from './xplane';
  import JSZip from 'jszip';
  import {generateSamples,loadWeather,flLevel,PRESSURES} from './weather';
  import type {ParsedRoute} from './navdb';
  import type {WeatherRow} from './weather';
  let routeText='EHAM DCT EDDF DCT LTFM DCT OMDB';
  let status='Загрузка базы ещё не началась';
  let navdataUrl='';
  let xplaneCycle='';
  let xplaneWarnings:string[]=[];
  let selectedXplaneFiles:File[]=[];
  let uploadLink='';
  let parsed:ParsedRoute|null=null;
  let lines:L.Polyline[]=[];
  let markers:L.Marker[]=[];
  let weather:WeatherRow[]=[];
  let weatherFL=350;
  let busy=false;
  let overlay='wind';
  let model='ecmwf';
  let fl=350;
  let tas=450;
  let etdValue=new Date(Date.now()+2*3600000).toISOString().slice(0,16);
  let pointTotal=0,loadedSources=0,imported=0,airways=0;
  const pressuresDescending=[...PRESSURES].reverse();
  const clearMap=()=>{for(const l of lines)map.removeLayer(l);for(const m of markers)map.removeLayer(m);lines=[];markers=[];};
  const clearRoute=()=>{clearMap();routeText='';parsed=null;weather=[];status='Маршрут очищен';};
  function runRoute():void {
    clearMap();weather=[];parsed=parseRoute(routeText);
    const safeSegments=parsed.segments.filter(s=>s.length>=2);
    if(!safeSegments.length){status='Нет непрерывных проверенных участков. Проверь X-Plane базу, точки и ATS-трассы.';return;}
    const visibleCoords:[number,number][]=[];
    const displayed=new Set<number>();
    for(const segment of safeSegments){
      const coords=segment.map(p=>[p.lat,p.lon] as [number,number]);
      visibleCoords.push(...coords);
      lines.push(new L.Polyline(coords,{color:'#ff853b',weight:4,opacity:.95}).addTo(map));
      for(const p of segment)if(!displayed.has(p.index)){
        displayed.add(p.index);
        const icon=new L.DivIcon({html:`<span class="fr-waypoint">${p.ident}</span>`,className:'fr-label-icon',iconSize:[90,20],iconAnchor:[5,10]});
        markers.push(new L.Marker([p.lat,p.lon],{icon}).addTo(map));
      }
    }
    try {map.fitBounds(visibleCoords,{padding:[25,25],maxZoom:8});} catch(_e) {map.setView(visibleCoords[0],5);}
    status=`Построены только непрерывные участки: ${Math.round(parsed.distanceNm)} NM, разрывов ${parsed.gaps.length}. Не подтверждает ATS-маршрут.`;
  }
  function setWeatherLayer():void {
    const okModel=store.set('product',model as any);
    const okOverlay=store.set('overlay',overlay as any);
    const level=String(flLevel(Number(fl)))+'h';
    const okLevel=store.set('level',level as any);
    status=`Windy: ${overlay}, ${model}, ${level}` + ((!okLevel)?' (уровень для этого слоя/модели может быть недоступен)':'') + ((!okOverlay)?' (слой может быть недоступен)':'') + ((!okModel)?' (модель может быть недоступна)':'');
  }
  async function updateHosted():Promise<void> {
    if(!navdataUrl.trim()) {status='Вставьте ссылку на публичный GitHub-репозиторий';return;}
    busy=true;
    try {
      status='Загрузка навигационной базы напрямую из GitHub…';
      const result=await loadGithubSnapshot(navdataUrl);
      try {localStorage.setItem('windy-flight-navdata-url',navdataUrl.trim());} catch(_) {}
      pointTotal=totalPoints();airways=airwayCount();
      runRoute();
      status=`GitHub: +${result.points} точек, ${result.airwayVertices} вершин трасс, AIRAC ${result.cycle}, опубликовано ${result.generated||'неизвестно'}`;
    } catch(e) {status='Ошибка базы GitHub: '+String(e);}
    finally {busy=false;}
  }
  function selectXPlaneFiles(event:Event):void {
    selectedXplaneFiles=Array.from((event.currentTarget as HTMLInputElement).files||[]);
    status=selectedXplaneFiles.length
      ?`Выбрано файлов: ${selectedXplaneFiles.map(f=>f.name).join(', ')}. Нажмите «Импортировать».`
      :'Файлы X-Plane не выбраны';
  }
  function navFileKind(filename:string):'fix'|'nav'|'awy'|null {
    // Safari allows renaming .dat to .txt to bypass an iPad file picker limitation.
    const base=filename.split(/[\\/]/).pop()!.toLowerCase();
    const normal=base.replace(/\.dat\.txt$/,'.dat').replace(/\.txt$/,'.dat');
    if(normal==='earth_fix.dat')return 'fix';
    if(normal==='earth_nav.dat')return 'nav';
    if(normal==='earth_awy.dat')return 'awy';
    return null;
  }
  async function readXPlaneInputs(files:File[]):Promise<{fix:string;nav:string;awy:string}> {
    const zipFiles=files.filter(file=>/\.zip$/i.test(file.name));
    const contents:Record<string,string>={};
    if(zipFiles.length){
      if(zipFiles.length!==1||files.length!==1)throw Error('Для импорта ZIP выберите только один архив, без дополнительных файлов');
      if(zipFiles[0].size>80*1024*1024)throw Error('ZIP превышает 80 МБ, импорт на iPad ограничен для экономии памяти');
      const zip=await JSZip.loadAsync(zipFiles[0]);
      const matches:Record<string,JSZip.JSZipObject>={};
      for(const entry of Object.values(zip.files)){
        if(entry.dir||entry.name.startsWith('__MACOSX/')||entry.name.includes('/._'))continue;
        const kind=navFileKind(entry.name);
        if(!kind)continue;
        if(matches[kind])throw Error(`В архиве несколько файлов earth_${kind}.dat. Оставьте один комплект AIRAC.`);
        // Check inflated size before allocating full text; JSZip does not expose
        // public uncompressed size. Large whole-archive size is capped above.
        matches[kind]=entry;
      }
      for(const kind of ['fix','nav','awy']){
        if(!matches[kind])throw Error(`В ZIP отсутствует earth_${kind}.dat`);
        contents[kind]=await matches[kind].async('string');
      }
    } else {
      const matches:Record<string,File>={};
      for(const file of files){
        const kind=navFileKind(file.name);
        if(!kind)continue;
        if(matches[kind])throw Error(`Выбраны дубликаты earth_${kind}.dat`);
        matches[kind]=file;
      }
      for(const kind of ['fix','nav','awy']){
        if(!matches[kind])throw Error(`Не найден earth_${kind}.dat. Можно также переименовать его в earth_${kind}.txt`);
        contents[kind]=await matches[kind].text();
      }
    }
    return {fix:contents.fix,nav:contents.nav,awy:contents.awy};
  }
  async function importXPlane():Promise<void> {
    if(!selectedXplaneFiles.length){status='Сначала выберите ZIP или три файла';return;}
    busy=true;
    try {
      status='Распаковка/чтение базы X-Plane и проверка AIRAC…';
      const input=await readXPlaneInputs(selectedXplaneFiles);
      const result=convertXPlane(input);
      status='Конвертация завершена; загрузка точек и трасс в карту…';
      const counts=loadLocalXPlaneSnapshot(result.pointsCsv,result.airwaysCsv);
      xplaneCycle=result.cycle;
      xplaneWarnings=result.warnings;
      pointTotal=totalPoints();airways=airwayCount();runRoute();
      status=`X-Plane AIRAC ${result.cycle}: ${counts.points.toLocaleString('ru-RU')} новых точек, ${result.airwayEdges.toLocaleString('ru-RU')} участков трасс; ошибок сегментов: ${result.rejectedEdges}.`;
    } catch(error){status='Ошибка импорта X-Plane: '+String(error);}
    finally {busy=false;}
  }
  function openGitHubUpload():void {
    try {
      uploadLink=githubUploadUrl(navdataUrl);
      window.open(uploadLink,'_blank','noopener,noreferrer');
      status='Открыта страница загрузки GitHub. Выберите один ZIP (например, xplane-navdata.zip) либо три earth_*.dat, затем Commit changes.';
    } catch(e){status='Укажите адрес репозитория GitHub: '+String(e);}
  }
  async function reloadSources():Promise<void>{
    busy=true;
    try {await loadOpenSources(msg=>{status=msg;pointTotal=totalPoints();loadedSources=sourceCount();});
      pointTotal=totalPoints();loadedSources=sourceCount();if(routeText)runRoute();}
    catch(e){status='Ошибка навигационной базы: '+String(e);}
    finally {busy=false;}
  }
  async function importFile(evt:Event):Promise<void>{
    const file=(evt.currentTarget as HTMLInputElement).files?.[0];if(!file)return;
    try {const text=await file.text();const isAirways=/^.*\bairway\b.*\bsegment\b.*\bseq\b/i.test(text.split('\n')[0]);const n=isAirways?importAirwaysCsv(text):importCsv(text,'user file');imported=userPointCount();airways=airwayCount();pointTotal=totalPoints();runRoute();status=`Импортировано ${n} ${isAirways?'вершин трасс':'точек'} из ${file.name}`;}
    catch(e){status='Импорт не выполнен: '+String(e);}
  }
  async function analyze():Promise<void>{
    if(!parsed || parsed.points.length<2 || parsed.gaps.length>0 || parsed.unresolved.length>0){status="Анализ недоступен: маршрут содержит неподтверждённые участки";return;}
    const date=new Date(etdValue+'Z');
    if(Number.isNaN(date.getTime())||!(tas>0)){status='Проверьте ETD UTC и TAS';return;}
    busy=true;weather=[];
    try {
      const samples=generateSamples(parsed.points,date,Number(tas));
      weather=await loadWeather(samples,Number(fl),text=>status=text);
      weatherFL=Number(fl);
      status=`Профиль получен для ${weather.length} точек (Open-Meteo, ETA приблизительно).`;
      // Sync Windy timeline to departure time; API may reject out-of-range timestamps.
      store.set('timestamp',date.getTime() as any);
    } catch(err) {status='Не удалось получить прогноз: '+String(err);}
    finally {busy=false;}
  }
  function downloadWeather():void {
    if(!weather.length)return;
    const rows=[['point','lat','lon','nm','eta_utc','fl','hpa','temp_c','rh_percent','wind_kt','wind_dir','cape_jkg','indicators'].join(',')];
    for(const w of weather){const m=w.atFl;rows.push([w.sample.label,w.sample.lat.toFixed(5),w.sample.lon.toFixed(5),w.sample.distanceNm.toFixed(1),w.sample.eta.toISOString(),weatherFL,w.flPressure,m?.temp??'',m?.rh??'',m?.windKt??'',m?.windDir??'',m?.cape??'',`"${w.alerts.join(' | ')}"`].join(','));}
    const a=document.createElement('a'),u=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.href=u;a.download='flight-weather-prototype.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  export const onopen=()=>{if(parsed?.points.length)runRoute();};
  onMount(()=>{
    loadDemo();pointTotal=totalPoints();runRoute();
    try {navdataUrl=localStorage.getItem('windy-flight-navdata-url')||'';} catch(_) {}
    (async()=>{await reloadSources();if(navdataUrl)await updateHosted();})();
  });
  onDestroy(()=>{clearMap();});
</script>
<style lang="less">
  .flightplanner {font-size:12px;color:#eee; padding:8px 14px 32px; overflow-y:auto; max-height:100%;}
  .flightplanner h3 {font-size:15px;font-weight:700;margin:13px 0 8px;}
  .flightplanner h4 {font-size:13px;margin:12px 0 5px;}
  .flightplanner label {display:block;font-size:12px;margin:8px 0 4px;font-weight:600;}
  .flightplanner textarea, .flightplanner input, .flightplanner select {box-sizing:border-box;width:100%;padding:9px;background:#292d35;color:#fff;border:1px solid #555c66;border-radius:6px;min-width:0;font-size:12px;}
  .flightplanner textarea {font:12px/1.45 ui-monospace,monospace;resize:vertical;}
  .flightplanner button {border:1px solid #727a85;border-radius:6px;padding:9px 10px;background:#343941;color:white;cursor:pointer;font-weight:600;font-size:12px;}
  .flightplanner button.primary {background:#176db7;border-color:#2e85cf;}
  .flightplanner button:disabled {opacity:.45;cursor:not-allowed;}
  .flightplanner button.full {width:100%;}
  .flightplanner .btnrow {display:flex;gap:7px;margin:9px 0;flex-wrap:wrap;}
  .flightplanner .twofields {display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end;}
  .flightplanner .small {font-size:11px;line-height:1.5;color:#bfc6cf;margin:7px 0;}
  .flightplanner .muted {color:#8f9aa7;font-size:10px;}
  .flightplanner .disclaimer {background:#402e22;color:#ffce96;padding:8px;border-left:3px solid #e89542;font-size:11px;}
  .flightplanner .warning {border-left:3px solid #ff994a;padding:8px;background:#463126;font-size:11px;line-height:1.5;}
  .flightplanner .info {color:#b9ddff;font-size:11px;line-height:1.5;}
  .flightplanner .stats {padding:7px 0;}
  .flightplanner .scrolltable {overflow:auto;max-height:250px;border:1px solid #444b55;border-radius:5px;margin:7px 0;}
  .flightplanner table {border-collapse:collapse;white-space:nowrap;font-size:11px;min-width:100%;}
  .flightplanner th,.flightplanner td {text-align:left;padding:6px;border-bottom:1px solid #3f4650;border-right:1px solid #3f4650;}
  .flightplanner th {position:sticky;top:0;background:#343a43;}
  .flightplanner td.flag {background:#633f20;color:#ffd8a5;}
  .flightplanner hr {border:0;border-top:1px solid #4b515b;margin:14px 0;}
  .flightplanner details summary {cursor:pointer;}
  :global(.fr-label-icon) {background:transparent;border:none;}
  :global(.fr-waypoint) {display:inline-block;color:#fff;background:rgba(20,28,40,.85);border:1px solid #ff9b53;border-radius:4px;padding:3px 5px;font-size:10px;font-weight:bold;white-space:nowrap;}
</style>
