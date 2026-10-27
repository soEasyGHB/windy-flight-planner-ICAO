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
    <div class="stats"><b>{parsed.points.length}</b> найдено точек · <b>{Math.round(parsed.distanceNm)} NM</b> (только подтверждённые участки) · <b>{labeledCount}</b> подписей на карте</div>
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
  <h3>Вылет и скорость полёта</h3>
  <div class="flightinputs">
    <div><label for="fr-etd-date">Дата вылета (UTC)</label><input id="fr-etd-date" type="date" bind:value={etdDate} on:change={flightInputsChanged} /></div>
    <div><label for="fr-etd-time">Время вылета (UTC)</label><input id="fr-etd-time" type="time" step="60" bind:value={etdTime} on:change={flightInputsChanged} /></div>
    <div><label for="fr-tas">TAS, kt</label><input id="fr-tas" type="number" min="100" max="700" step="5" bind:value={tas} on:change={flightInputsChanged}/></div>
  </div>
  <div class="btnrow">
    <button type="button" class="primary" disabled={busy} on:click={openNativeRoutePlanner}>{parsed && !canExportRoute ? "Открыть доступный участок в Windy" : "Открыть в Windy Route Planner"}</button>
    <button type="button" disabled={busy} on:click={downloadPlannerGpx}>{parsed && !canExportRoute ? "Скачать GPX по участкам" : "Скачать GPX (резерв)"}</button>
    <button type="button" on:click={setMapToDeparture}>Время Windy = ETD</button>
  </div>
  {#if parsed && !canExportRoute}
    <div class="warning" role="alert"><b>Полный маршрут не подтверждён.</b> {routeExportWarning}.<br />
    В Route Planner можно передать только самый длинный непрерывный участок, а GPX сохранит все доступные участки раздельно, без соединения разрывов. Это НЕ полный IFR-маршрут.
    <details><summary>Диагностика экспорта</summary><ul>{#each routeIssues(parsed) as issue}<li>{issue}</li>{/each}</ul></details></div>
  {/if}
  {#if parsed && parsed.ambiguous.length}
    <label class="info"><input type="checkbox" bind:checked={acceptAmbiguousFixes} /> Я проверил координаты неоднозначных точек: {parsed.ambiguous.join(', ')}. Разрешить экспорт для визуализации (не для IFR-навигации).</label>
  {/if}
  {#if plannerUrl}<p class="info"><a href={plannerUrl} target="_blank" rel="noopener noreferrer">Открыть подготовленную ссылку в Safari → Windy Route Planner</a></p>{/if}
  <p class="small">Одна кнопка передаёт геометрию трасс штатному Route Planner по ссылке Windy. Если передача не поддерживается приложением iPad или маршрут слишком длинный, используй GPX. ETD и TAS задаются выше; штатный Route Planner может потребовать повторно выбрать дату UTC, IFR и скорость (450 kt по умолчанию) — публичная ссылка передаёт только координаты.</p>
  <p class="small">Время на нижней шкале Windy устанавливается по UTC. ETA расчётное: расстояние / TAS, без ветровой поправки.</p>
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
  <p class="small">Метеоразрез и таблица ниже используют прогноз Open-Meteo (Best Match), отличный от выбранной карты Windy. ETD UTC и TAS задаются выше. Тропопауза — приближённая оценка по вертикальному температурному градиенту модели, а не фактическая авиационная высота тропопаузы.</p>
  <div class="btnrow">
    <button type="button" class="primary" disabled={busy} on:click={openWeatherProfile}>Получить профиль и открыть</button>
    <button type="button" disabled={!weather.length} on:click={downloadWeather}>CSV отчёт</button>
  </div>
  {#if weather.length}
    <h4>Параметры на FL{weatherFL} (ориентировочный ближайший уровень {weather[0].flPressure} hPa)</h4>
    <div class="scrolltable"><table><thead><tr><th>Место</th><th>ETA UTC</th><th>T °C</th><th>Ветер kt</th><th>ISA Δ°C</th><th>Тропопауза≈ FL</th><th>RH %</th><th>Индикаторы*</th></tr></thead><tbody>
      {#each weather as w}
        <tr><td>{w.sample.label}<span class="muted"> · {Math.round(w.sample.distanceNm)}NM</span></td>
          <td>{w.sample.eta.toISOString().slice(11,16)}</td><td>{w.atFl?.temp ?? '—'}</td>
          <td>{w.atFl?.windKt ?? '—'}</td><td>{w.atFl?.isaDeviationC ?? '—'}</td><td>{w.tropopauseFL ?? '—'}</td><td>{w.atFl?.rh ?? '—'}</td>
          <td class:flag={w.alerts.length>0}>{w.alerts.length?w.alerts.join('; '):'—'}</td></tr>
      {/each}
    </tbody></table></div>
    <h4>Прогноз для каждой маршрутной точки: FL300–FL400, шаг 10</h4>
    <p class="small">Колонки — только названия точек из OFP, без искусственных S1/S2 и без промежуточных вершин ATS. Расчёт по ETA каждой точки при TAS {tas} kt, без ветровой поправки. Значения между изобарическими уровнями интерполированы по логарифму давления.</p>
    <div class="scrolltable"><table><thead><tr><th>FL</th><th>Точка</th><th>ETA UTC</th><th>Ветер, ° / kt</th><th>T °C</th><th>ISA Δ°C</th></tr></thead><tbody>
      {#each weather as w}
        {#each cruiseFlightLevels as level}
          <tr><td>FL{level}</td><td>{w.sample.label}</td><td>{w.sample.eta.toISOString().slice(11,16)}</td>
            <td>{w.flightLevels[level]?.windDir ?? '—'}° / {w.flightLevels[level]?.windKt ?? '—'}</td>
            <td>{w.flightLevels[level]?.temp ?? '—'}</td><td>{w.flightLevels[level]?.isaDeviationC ?? '—'}</td></tr>
        {/each}
      {/each}
    </tbody></table></div>
    <h4>Дополнительно: вертикальный разрез по изобарическим уровням</h4>
    <div class="scrolltable"><table><thead><tr><th>hPa ≈ FL</th>{#each weather as w}<th>{w.sample.label}</th>{/each}</tr></thead><tbody>
      {#each pressuresDescending as p}
      <tr><td>{p} ≈ FL{Math.round((44330.77*(1-Math.pow(p/1013.25,1/5.25588))/0.3048)/100)}</td>
        {#each weather as w}
          <td class:flag={w.levels[p].indicators.length>0} title={w.levels[p].indicators.join('; ')}>
            {w.levels[p].temp ?? '—'}° / {w.levels[p].windKt ?? '—'}kt / {w.levels[p].isaDeviationC ?? '—'}° {w.levels[p].indicators.length?'*':''}
          </td>
        {/each}</tr>
      {/each}
    </tbody></table></div>
    <p class="small">Данные прогноза: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0). Интерполяция вдоль маршрута и пороговые индикаторы — модификации в этом проекте.</p>
    <p class="small">* Индикаторы по упрощённым порогам: T от −20 до 0 °C и RH ≥80% (условия возможного обледенения); ветер ≥100 kt; CAPE &gt;1000 J/kg; разница скорости ветра ≥35 kt между соседними уровнями. Это <b>НЕ</b> прогноз фактического обледенения, CAT/турбулентности, гроз по трассе или опасных явлений по ICAO. Для решений используйте SIGMET, значимые карты, AIP, NOTAM и утверждённые источники.</p>
  {/if}
  <hr />
  <h3>Навигационная база данных — Google Drive → GitHub</h3>
  <p class="small">Положи один ZIP с файлами <code>earth_fix.dat</code>, <code>earth_nav.dat</code>, <code>earth_awy.dat</code> одного AIRAC в публично доступную папку Google Drive. GitHub Actions проверяет её по расписанию, конвертирует базу и публикует CSV для Windy. Ссылка на папку задаётся в GitHub Actions → Variables как <code>GDRIVE_NAVDATA_FOLDER_URL</code>.</p>
  <p class="small">Репозиторий базы: <a href={repoUrl} target="_blank" rel="noopener noreferrer">{repoUrl}</a></p>
  <div class="btnrow">
    <button type="button" on:click={openSyncWorkflow}>Проверить синхронизацию Google Drive</button>
    <button type="button" on:click={openGitHubUpload}>Резерв: загрузить ZIP через GitHub</button>
    <button type="button" class="primary" disabled={busy} on:click={updateHosted}>Проверить новую базу</button>
  </div>
  {#if githubCycle}
    <p class="info">GitHub: AIRAC {githubCycle}, обновлено {githubGenerated || 'дата не указана'}; точек {githubPoints.toLocaleString('ru-RU')}; вершин трасс {githubVertices.toLocaleString('ru-RU')}.</p>
  {:else}
    <p class="warning">Навигационная база ещё не загружена из GitHub. Проверь доступность исходных данных и статус GitHub Actions → build-navdata. Без базы трассы могут остаться неопознанными.</p>
  {/if}
  <p class="small">Синхронизация папки Drive выполняется ежедневно и по кнопке Run workflow на GitHub. Windy загружает последнюю обработанную базу при открытии или по кнопке «Проверить новую базу». Для обновления AIRAC повторная публикация кода плагина не нужна.</p>
  <p class="warning">Важно: публичная ссылка Drive нужна для автоматической загрузки без Google OAuth. А Windy читает CSV только из публичного GitHub-репозитория — из приватного без токена не сможет. Не публикуй коммерческие навигационные данные без права на их распространение.</p>
  <p class="small">{pointTotal.toLocaleString('ru-RU')} точек (все загруженные источники), трасс: {airways}; дополнительные открытые источники: {loadedSources}/3. Геометрия предназначена только для визуализации, а не для IFR-навигации. Проверка AIRAC — только совпадение заголовков трёх файлов.</p>
</section>
{#if profileOpen && weather.length}
  <aside class="fr-profile-panel" aria-label="Метеоразрез маршрута">
    <div class="fr-profile-head">
      <div><strong>Профиль по маршруту</strong><span>ETD {etdDate} {etdTime} UTC · TAS {tas} kt · FL{weatherFL}</span></div>
      <div class="fr-profile-tools"><label for="fr-metric">Высотный разрез</label>
        <select id="fr-metric" bind:value={profileMetric}>
          <option value="all">Все: ветер, T, ISA</option><option value="wind">Ветер</option><option value="isa">ISA deviation</option><option value="temp">Температура</option>
        </select>
        <button type="button" on:click={() => profileOpen=false} aria-label="Закрыть метеоразрез">✕</button>
      </div>
    </div>
    <div class="fr-profile-scroll">
      <div class="fr-profile-grid" style={`grid-template-columns: 86px repeat(${weather.length}, minmax(105px, 1fr))`}>
        <div class="fr-profile-heading">ETA / NM</div>
        {#each weather as w,i}
          <button type="button" class={i===activeProfileIndex ? 'fr-active' : ''} on:click={() => selectProfilePoint(i)} title="Переключить время карты Windy на ETA точки">
            <b>{w.sample.label}</b><small>{w.sample.eta.toISOString().slice(11,16)}Z · {Math.round(w.sample.distanceNm)}NM</small>
          </button>
        {/each}
        <div class="fr-profile-heading">Ветер FL{weatherFL}</div>
        {#each weather as w}
          <div class="fr-profile-value">{w.atFl?.windDir ?? '—'}° / <b>{w.atFl?.windKt ?? '—'} kt</b></div>
        {/each}
        <div class="fr-profile-heading">ISA Δ°C</div>
        {#each weather as w}
          <div class="fr-profile-value fr-isa">{w.atFl?.isaDeviationC == null ? '—' : `${w.atFl.isaDeviationC > 0 ? '+' : ''}${w.atFl.isaDeviationC}°C`}</div>
        {/each}
        <div class="fr-profile-heading">Тропопауза≈</div>
        {#each weather as w}
          <div class="fr-profile-value">{w.tropopauseFL == null ? 'н/д' : `FL${w.tropopauseFL}`}</div>
        {/each}
        {#each cruiseFlightLevels as level}
          <div class="fr-profile-heading">FL{level}</div>
          {#each weather as w}
            <div class="fr-profile-value" title={`FL${level} · ${w.sample.label} · ${w.sample.eta.toISOString().slice(11,16)} UTC`}>
              {#if profileMetric==='all'}
                <b>{w.flightLevels[level]?.windDir ?? '—'}° / {w.flightLevels[level]?.windKt ?? '—'} kt</b>
                <small>T {w.flightLevels[level]?.temp ?? '—'}°C · ISA {w.flightLevels[level]?.isaDeviationC ?? '—'}°C</small>
              {:else if profileMetric==='wind'}
                <b>{w.flightLevels[level]?.windKt ?? '—'} kt</b><small>{w.flightLevels[level]?.windDir ?? '—'}°</small>
              {:else if profileMetric==='isa'}
                <b>{w.flightLevels[level]?.isaDeviationC ?? '—'} °C</b>
              {:else}
                <b>{w.flightLevels[level]?.temp ?? '—'} °C</b>
              {/if}
            </div>
          {/each}
        {/each}
      </div>
    </div>
    <p class="fr-profile-note">Точки расчётные, время UTC · нажми на точку для смены времени Windy. Профиль Open-Meteo, а не встроенный Route Planner Windy. Тропопауза — приблизительная диагностическая оценка, не официальный SIGWX.</p>
  </aside>
{/if}
<script lang="ts">
  import bcast from '@windy/broadcast';
  import config from './pluginConfig';
  const {title} = config;
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { onMount,onDestroy } from 'svelte';
  import {loadDemo,loadOpenSources,airwayCount,parseRoute,mapLabelPoints,totalPoints,sourceCount,loadGithubSnapshot,githubUploadUrl} from './navdb';
  import {NAVDATA_GITHUB_REPO} from './navdataConfig';
  import {generateWaypointSamples,loadWeather,flLevel,PRESSURES,standardAltitudeM} from './weather';
  import {buildWindyPlannerLink,buildPartialWindyPlannerLink,makeRouteGpx,routeIssues} from './routePlanner';
  import type {ParsedRoute} from './navdb';
  import type {WeatherRow} from './weather';
  let routeText='EHAM DCT EDDF DCT LTFM DCT OMDB';
  let status='Загрузка базы ещё не началась';
  const repoUrl = NAVDATA_GITHUB_REPO;
  let githubCycle='';
  let githubGenerated='';
  let githubPoints=0;
  let githubVertices=0;
  let parsed:ParsedRoute|null=null;
  let plannerUrl='';
  let routeExportWarning='';
  let canExportRoute=false;
  let acceptAmbiguousFixes=false;
  $: {
    const r=parsed;
    routeExportWarning=!r?'сначала построй маршрут':
      r.points.length<2?'найдено менее двух точек':
      r.gaps.length?`разрывы: ${r.gaps.map(g=>g.from+'–'+g.to).join(', ')}`:
      r.unresolved.length?`неизвестные точки: ${r.unresolved.join(', ')}`:
      r.airwayNames.length?`неразвёрнутые ATS: ${r.airwayNames.join(', ')}`:
      r.ambiguous.length&&!acceptAmbiguousFixes?`требуют подтверждения координат: ${r.ambiguous.join(', ')}`:
      r.segments.length!==1?'нет единого подтверждённого участка': '';
    canExportRoute=!!r&&!routeExportWarning;

  }
  let lines:L.Polyline[]=[];
  let markers: Array<L.CircleMarker | L.Marker>=[];
  let labeledCount=0;
  let weather:WeatherRow[]=[];
  let weatherFL=350;
  let busy=false;
  let overlay='wind';
  let model='ecmwf';
  let fl=350;
  let tas=450;
  const initialETD=new Date(Date.now()+2*3600000).toISOString().slice(0,16);
  let etdDate=initialETD.slice(0,10);
  let etdTime=initialETD.slice(11,16);
  let profileOpen=false;
  let activeProfileIndex=0;
  let profileMetric:'all'|'wind'|'isa'|'temp'='all';
  const cruiseFlightLevels=[300,310,320,330,340,350,360,370,380,390,400];
  const profilePressureLevels=[500,400,300,250,200,150,100];
  let pointTotal=0,loadedSources=0,airways=0;
  const pressuresDescending=[...PRESSURES].reverse();
  const clearMap=()=>{
    // Broken/unavailable map layers must not stop the plugin panel from opening.
    for(const layer of [...lines, ...markers]) {
      try { map.removeLayer(layer); } catch (err) { console.warn('Could not remove route layer',err); }
    }
    lines=[];markers=[];
  };
  const clearRoute=()=>{clearMap();routeText='';parsed=null;plannerUrl='';labeledCount=0;weather=[];profileOpen=false;acceptAmbiguousFixes=false;status='Маршрут очищен';};
  function runRoute():void {
    clearMap();weather=[];profileOpen=false;plannerUrl='';acceptAmbiguousFixes=false;parsed=parseRoute(routeText);
    const safeSegments=parsed.segments.filter(s=>s.length>=2);
    const namedFixes=mapLabelPoints(parsed);
    labeledCount=0;
    if(!safeSegments.length && !namedFixes.length){status='Нет распознанных точек или непрерывных участков. Проверь навигационную базу данных и маршрут.';return;}
    const visibleCoords:[number,number][]=[];
    for(const segment of safeSegments){
      const coords=segment.map(p=>[p.lat,p.lon] as [number,number]);
      visibleCoords.push(...coords);
      lines.push(new L.Polyline(coords,{color:'#ff853b',weight:4,opacity:.95}).addTo(map));
    }
    // Label ONLY fixes explicitly named in the flight plan. Never label
    // expanded airway geometry (M56-2 / B105-3 / ...).
    // Windy leaflet-gl does not support old factory functions L.circleMarker(),
    // L.marker(), etc. Use the constructor API (new L.CircleMarker / Marker).
    for (const p of namedFixes) {
      let drawn = false;
      let dot: L.CircleMarker | undefined;
      try {
        dot = new L.CircleMarker([p.lat,p.lon], {
          radius:3.5, color:'#fff', weight:1.4,
          fillColor:'#ff853b', fillOpacity:1, interactive:false
        });
        if (typeof dot.bindTooltip !== 'function') throw Error('Tooltip not available');
        const safeLabel = document.createElement('span');
        safeLabel.textContent = p.ident;
        dot.bindTooltip(safeLabel, {
          permanent:true, direction:'right', offset:[7,0],
          className:'fr-route-fix-tooltip', opacity:1, interactive:false
        });
        markers.push(dot.addTo(map));
        drawn = true;
      } catch (err) {
        console.warn('Tooltip marker unavailable; using DivIcon fallback', p.ident, err);
        if (dot) try { map.removeLayer(dot); } catch (_err) { /* already removed */ }
        // Fallback used before v0.6.2 and compatible with new Windy constructors.
        try {
          const label = new L.DivIcon({
            html:`<span class="fr-waypoint">${p.ident}</span>`,
            className:'fr-label-icon', iconSize:[90,22], iconAnchor:[5,11]
          });
          const marker = new L.Marker([p.lat,p.lon], {
            icon:label, interactive:false, zIndexOffset:10000
          });
          markers.push(marker.addTo(map));
          drawn = true;
        } catch (fallbackError) {
          console.error('Could not create waypoint marker',p.ident,fallbackError);
        }
      }
      if (drawn) labeledCount++;
    }
    // Fit only verified route legs; still show labeled isolated fixes for diagnosis.
    if(!visibleCoords.length) visibleCoords.push(...namedFixes.map(p=>[p.lat,p.lon] as [number,number]));
    if(visibleCoords.length) {
      try {map.fitBounds(visibleCoords,{padding:[35,35],maxZoom:8});}
      catch(_e) {map.setView(visibleCoords[0],5);}
    }
    status=`Маршрут: ${Math.round(parsed.distanceNm)} NM; подписей точек: ${labeledCount}; разрывов: ${parsed.gaps.length}. ATS-трассы показаны только линией.`;
    syncWindyTimestamp(departureDate(),false);
  }
  function setWeatherLayer():void {
    const okModel=store.set('product',model as any);
    const okOverlay=store.set('overlay',overlay as any);
    const level=String(flLevel(Number(fl)))+'h';
    const okLevel=store.set('level',level as any);
    status=`Windy: ${overlay}, ${model}, ${level}` + ((!okLevel)?' (уровень для этого слоя/модели может быть недоступен)':'') + ((!okOverlay)?' (слой может быть недоступен)':'') + ((!okModel)?' (модель может быть недоступна)':'');
  }
  async function updateHosted():Promise<void> {
    busy=true;
    try {
      status='Получаю обработанные навигационные данные из GitHub…';
      const result=await loadGithubSnapshot(repoUrl);
      githubCycle=result.cycle;
      githubGenerated=result.generated;
      githubPoints=result.points;
      githubVertices=result.airwayVertices;
      pointTotal=totalPoints();airways=airwayCount();
      runRoute();
      status=`GitHub: AIRAC ${result.cycle}; ${result.points.toLocaleString('ru-RU')} точек, ${result.airwayVertices.toLocaleString('ru-RU')} вершин трасс. Маршрут перестроен.`;
    } catch(e) {
      status='Не удалось загрузить базу GitHub: '+String(e)+'; проверь публичный доступ, manifest и Actions/build-navdata.';
    } finally {busy=false;}
  }
  function openSyncWorkflow():void {
    window.open(repoUrl+'/actions/workflows/sync-gdrive-navdata.yml','_blank','noopener,noreferrer');
    status='В GitHub: Actions → sync-gdrive-navdata → Run workflow. Публичную ссылку Drive укажи в Settings → Secrets and variables → Actions → Variables.';
  }
  function openGitHubUpload():void {
    const link=githubUploadUrl(repoUrl);
    window.open(link,'_blank','noopener,noreferrer');
    status='Резервный способ: на GitHub загрузи ZIP в navdata-input → Commit changes, затем Actions/build-navdata.';
  }
  async function reloadSources():Promise<void>{
    try {
      await loadOpenSources(msg=>{status=msg;pointTotal=totalPoints();loadedSources=sourceCount();});
      pointTotal=totalPoints();loadedSources=sourceCount();
      // Only use open sources as fallback; GitHub X-Plane is the main source.
      if(routeText)runRoute();
    } catch(e) {status='Часть дополнительных источников недоступна: '+String(e);}
  }
  function departureDate():Date {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(etdDate) || !/^\d{2}:\d{2}$/.test(etdTime)) return new Date(NaN);
    const dt=new Date(`${etdDate}T${etdTime}:00Z`);
    return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0,16)===`${etdDate}T${etdTime}` ? dt : new Date(NaN);
  }
  function syncWindyTimestamp(when:Date,showStatus=true):void {
    if(Number.isNaN(when.getTime())) {status='Укажи корректные дату и время вылета UTC';return;}
    const ok=store.set('timestamp',when.getTime() as any);
    const actual=Number(store.get('timestamp'));
    if(showStatus) status= ok || Math.abs(actual-when.getTime())<60000
      ? `Временная шкала Windy: ${when.toISOString().slice(0,16).replace('T',' ')} UTC`
      : 'Windy не принял время: дата может быть вне доступного горизонта прогноза';
  }
  function setMapToDeparture():void {syncWindyTimestamp(departureDate());}

  /** Direct Windy URL handoff, within the same browser/app context. */
  function openNativeRoutePlanner():void {
    if(!parsed) { status='Сначала построй маршрут'; return; }
    const date=departureDate();
    if(Number.isNaN(date.getTime()) || !(Number(tas)>=100&&Number(tas)<=700)) {
      status='Проверь дату/время вылета UTC и TAS (100–700 kt)'; return;
    }
    try {
      if(parsed.ambiguous.length&&!acceptAmbiguousFixes)throw Error('Неоднозначные точки: '+parsed.ambiguous.join(', ')+'. Сначала проверь координаты и отметь подтверждение.');
      const full=!parsed.gaps.length&&!parsed.unresolved.length&&!parsed.airwayNames.length&&parsed.segments.length===1;
      const link=full ? buildWindyPlannerLink(parsed,3500,acceptAmbiguousFixes)
        : buildPartialWindyPlannerLink(parsed,3500,acceptAmbiguousFixes);
      plannerUrl=link.url;
      // Best effort sync before page navigation. URL itself does not encode ETD/TAS.
      syncWindyTimestamp(date,false);
      // A direct user-initiated navigation. In iPad's embedded browser it may be
      // blocked; the explicit anchor above lets the pilot open it in Safari.
      const opened=window.open(link.url,'_blank');
      const partial=!full || parsed.ambiguous.length>0;
      const suffix=partial ? (' ВНИМАНИЕ: '+(full?'координаты неоднозначных FIX требуют проверки.':'передан только один подтверждённый участок '+('from' in link ? link.from+' → '+link.to : '')+'; это НЕ весь маршрут.')) : '';
      status=(opened ? `Windy Route Planner: ${link.verticesSent} координат.`
        : 'Ссылка создана. iPad мог заблокировать открытие — нажми ссылку Safari под кнопками.')+suffix;
    } catch(err) {
      status='Не удалось открыть в Windy: '+String(err)+'. Можно попробовать GPX по отдельным подтверждённым участкам.';
    }
  }
  function downloadPlannerGpx():void {
    if(!parsed){status='Сначала построй маршрут';return;}
    try {
      if(parsed.ambiguous.length&&!acceptAmbiguousFixes)throw Error('Неоднозначные FIX: '+parsed.ambiguous.join(', ')+'. Проверь координаты и отметь подтверждение.');
      const partial=!canExportRoute;
      const content=makeRouteGpx(parsed,{allowPartial:partial,acceptAmbiguous:acceptAmbiguousFixes});
      const filename=partial?'windy-route-PARTIAL.gpx':'windy-flight-route.gpx';
      const file=new File([content],filename,{type:'application/gpx+xml'});
      // Share Sheet enables Save to Files on iPad, where synthetic <a download>
      // can be silently ignored in native in-app browsers.
      if(typeof navigator.share==='function' && (!navigator.canShare || navigator.canShare({files:[file]}))) {
        status=partial?'Создан ЧАСТИЧНЫЙ GPX с отдельными проверенными участками. Проверь разрывы! Открываю меню «Поделиться».':'Открываю меню «Поделиться» — выбери «Сохранить в Файлы».';
        void navigator.share({files:[file]}).catch(e=>{status='Сохранение GPX отменено/недоступно: '+String(e);});
        return;
      }
      const url=URL.createObjectURL(file);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=filename;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      status=(partial?'ЧАСТИЧНЫЙ GPX: участки раздельны, пробелы не соединены. ':'GPX подготовлен. ')+'В Windy: Distance & planning → More → Import GPX.';
    } catch(err){status='GPX не создан: '+String(err);}
  }

  function flightInputsChanged():void {
    weather=[];profileOpen=false;activeProfileIndex=0;
    if(!(Number(tas)>=100 && Number(tas)<=700)) {status='TAS должна быть в диапазоне 100–700 kt';return;}
    syncWindyTimestamp(departureDate());
  }
  function selectProfilePoint(index:number):void {
    if(index<0 || index>=weather.length)return;
    activeProfileIndex=index;
    syncWindyTimestamp(weather[index].sample.eta);
  }
  async function openWeatherProfile():Promise<void> {
    await analyze();
    if(weather.length) {profileOpen=true;selectProfilePoint(0);}
  }
  async function analyze():Promise<void>{
    if(!canExportRoute){status='Прогноз недоступен: '+routeExportWarning;return;}
    const date=departureDate();
    if(Number.isNaN(date.getTime())||!(Number(tas)>=100 && Number(tas)<=700)){status='Проверьте ETD UTC и TAS (100–700 kt)';return;}
    busy=true;weather=[];
    try {
      if(!canExportRoute){status='Прогноз недоступен: '+routeExportWarning;return;}
      const samples=generateWaypointSamples(parsed.points,date,Number(tas));
      if(samples.length<2) throw Error('В маршруте недостаточно именованных точек для прогноза');
      weather=await loadWeather(samples,Number(fl),text=>status=text);
      weatherFL=Number(fl);
      status=`Прогноз FL300–FL400 получен для ${weather.length} именованных точек (Open-Meteo, ETA приблизительно).`;
      // Sync Windy timeline to departure time; API may reject out-of-range timestamps.
      syncWindyTimestamp(date,false);
    } catch(err) {status='Не удалось получить прогноз: '+String(err);}
    finally {busy=false;}
  }
  function downloadWeather():void {
    if(!weather.length)return;
    const rows=[['point','lat','lon','nm','eta_utc','fl','temp_c','wind_kt','wind_dir','isa_deviation_c','tropopause_approx_fl'].join(',')];
    for(const w of weather) for(const f of cruiseFlightLevels) {
      const c=w.flightLevels[f];
      rows.push([w.sample.label,w.sample.lat.toFixed(5),w.sample.lon.toFixed(5),w.sample.distanceNm.toFixed(1),w.sample.eta.toISOString(),f,c?.temp??'',c?.windKt??'',c?.windDir??'',c?.isaDeviationC??'',w.tropopauseFL??''].join(','));
    }
    const a=document.createElement('a'),u=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.href=u;a.download='flight-weather-FL300-FL400.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  export const onopen=()=>{
    if(parsed?.points.length) try { runRoute(); }
    catch(err) { console.error('Route rendering failed',err);status='Ошибка карты: '+String(err); }
  };
  onMount(()=>{
    loadDemo();pointTotal=totalPoints();
    try { runRoute(); }
    catch(err) { console.error('Initial map rendering failed',err);status='Не удалось нарисовать маршрут: '+String(err); }
    // On opening Windy, use the last published GitHub snapshot automatically.
    // Failures are visible and never silently replaced with an alleged full AIRAC database.
    (async()=>{await updateHosted();await reloadSources();})();
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
  .flightplanner .flightinputs {display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:8px;align-items:end;}
  .flightplanner .flightinputs input {min-width:0; width:100%; color-scheme:dark;}
  .fr-profile-panel {position:fixed;z-index:8000;bottom:75px;left:0;right:0;background:#1c2633;border-top:2px solid #d28e46;box-shadow:0 -7px 22px rgba(0,0,0,.44);color:#f5f7fa;padding:9px 10px 7px;font:12px/1.35 system-ui, sans-serif;max-height:42vh;overflow:hidden;}
  .fr-profile-head {display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 8px;}
  .fr-profile-head strong {font-size:14px;display:block;}
  .fr-profile-head span {font-size:11px;color:#cbd4df;display:block;margin-top:3px;}
  .fr-profile-head button {background:#364454;color:#fff;border:1px solid #6a7b8e;border-radius:5px;padding:7px 12px;cursor:pointer;}
  .fr-profile-tools {display:flex;gap:8px;align-items:center;}
  .fr-profile-tools label {font-size:11px;color:#d3dce6;}
  .fr-profile-tools select {background:#344457;color:#fff;border:1px solid #68788b;border-radius:5px;font-size:12px;padding:6px;}
  .fr-profile-grid small {display:block;font-size:10px;opacity:.8;}
  .fr-profile-scroll {overflow:auto;max-height:28vh;}
  .fr-profile-grid {display:grid;gap:1px;background:#43556b;min-width:max-content;}
  .fr-profile-grid>div,.fr-profile-grid>button {background:#253446;border:0;border-radius:0;text-align:center;color:#eef4fa;padding:7px 4px;min-height:27px;font:11px/1.35 system-ui,sans-serif;}
  .fr-profile-grid .fr-profile-heading {position:sticky;left:0;z-index:1;display:flex;align-items:center;justify-content:center;background:#16293c;color:#e4bb86;font-weight:700;width:86px;}
  .fr-profile-grid button {cursor:pointer;background:#344b64;}
  .fr-profile-grid button.fr-active {background:#1665ac;outline:2px solid #84cdff;outline-offset:-2px;}
  .fr-profile-grid button b,.fr-profile-grid button small {display:block;white-space:nowrap;}
  .fr-profile-grid button small {font-size:10px;opacity:.84;}
  .fr-profile-grid .fr-isa {color:#ffd09b;}
  .fr-profile-note {font-size:10px;color:#b7c8d9;margin:7px 0 0;}
  @media(max-width:520px) {.flightplanner .flightinputs {grid-template-columns:1fr 1fr;} .flightplanner .flightinputs>div:last-child{grid-column:span 2;} .fr-profile-panel {bottom:55px;max-height:50vh;} }
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
  :global(.leaflet-tooltip.fr-route-fix-tooltip) {
    background:rgba(20,28,40,.94);color:#fff;border:1px solid #ff9b53;
    border-radius:4px;padding:3px 6px;font-size:11px;font-weight:700;
    line-height:1.2;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.5);
    pointer-events:none;
  }
  :global(.leaflet-tooltip.fr-route-fix-tooltip:before) {display:none;}
  :global(.fr-label-icon) {background:transparent;border:none;z-index:10000;}
  :global(.fr-waypoint) {display:inline-block;color:#fff;background:rgba(20,28,40,.93);border:1px solid #ff9b53;border-radius:4px;padding:3px 5px;font-size:11px;font-weight:bold;white-space:nowrap;}
</style>
