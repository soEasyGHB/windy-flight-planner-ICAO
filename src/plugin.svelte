<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content flightplanner">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>
  <div class="fr-main-stack">
    <section class="fr-main-card" aria-labelledby="fr-section-route">
      <h3 id="fr-section-route">1. Ввод маршрута</h3>
      <label for="fr-route-input">Маршрут OFP / ICAO</label>
      <textarea id="fr-route-input" bind:value={routeText} rows="4" spellcheck="false" placeholder="EHAM DCT EDDF DCT LTFM DCT OMDB"></textarea>
      <div class="btnrow">
        <button type="button" class="primary" on:click={runRoute}>Построить маршрут</button>
        <button type="button" on:click={clearRoute}>Очистить</button>
      </div>
    </section>

    <section class="fr-main-card" aria-labelledby="fr-section-flight">
      <h3 id="fr-section-flight">2. Данные полёта</h3>
      <div class="fr-param-grid">
        <div><label for="fr-etd-date">Дата вылета (UTC)</label><input id="fr-etd-date" type="date" bind:value={etdDate} on:change={flightInputsChanged} /></div>
        <div><label for="fr-etd-time">Время вылета (UTC)</label><input id="fr-etd-time" type="time" step="60" bind:value={etdTime} on:change={flightInputsChanged} /></div>
        <div><label for="fr-flight-level">Эшелон FL</label><input id="fr-flight-level" type="number" min="10" max="450" step="10" bind:value={fl} on:input={flightLevelChanged} /></div>
        <div><label for="fr-tas">TAS, kt</label><input id="fr-tas" type="number" min="100" max="700" step="5" bind:value={tas} on:change={flightInputsChanged}/></div>
      </div>
    </section>

    <section class="fr-main-card" aria-labelledby="fr-section-weather">
      <h3 id="fr-section-weather">3. Слой погоды</h3>
      <label for="fr-overlay">Погодный слой Windy</label>
      <select id="fr-overlay" bind:value={overlay} on:change={setWeatherLayer}>
        <option value="thunder">Грозы</option>
        <option value="rain">Осадки</option>
        <option value="turbulence">Турбулентность</option>
        <option value="radar">Радар осадков</option>
        <option value="wind">Ветер</option>
        <option value="temp">Температура</option>
        <option value="icing">Обледенение</option>
        <option value="clouds">Облачность</option>
        <option value="rh">Влажность</option>
        <option value="cape">CAPE</option>
        <option value="cloudtop">Верхняя граница облаков</option>
      </select>
      <div class="btnrow"><button type="button" class="primary" on:click={setWeatherLayer}>Показать на карте</button></div>
    </section>

    <section class="fr-main-card" aria-labelledby="fr-section-export">
      <h3 id="fr-section-export">4. Планировщик и экспорт</h3>
      <div class="fr-action-grid">
        <button type="button" class="primary" disabled={busy} on:click={openNativeRoutePlanner}>Открыть в Windy Route Planner</button>
        <button type="button" disabled={busy} on:click={downloadPlannerGpx}>Скачать GPX</button>
        <button type="button" class="primary" on:click={saveOfflineHtml}>Сохранить HTML офлайн</button>
        <button type="button" on:click={openOfflinePrint}>Открыть для PDF</button>
      </div>
      <div class="btnrow"><button type="button" disabled={busy} on:click={openWeatherProfile}>Получить ветер, T и ISA по точкам</button></div>
    </section>
  </div>

  <details class="fr-settings">
    <summary>Настройки</summary>
    <div class="fr-settings-inner">
      <details class="fr-settings-group">
        <summary>Сообщения, ошибки и ограничения</summary>
        <div class="fr-settings-body">
        <p class="disclaimer">ПРОТОТИП: только для обзора погоды. Не использовать как навигационный документ или официальный предполётный брифинг.</p>
        <p class="info" aria-live="polite">{status}</p>
        {#if parsed && !canExportRoute}
          <p class="warning">Маршрут неполный или неоднозначный. Экспорт возможен только по подтверждённым участкам. Подробности — в «Диагностике маршрута».</p>
        {/if}
        {#if altitudeStatus}<p class="small fr-altitude-notice">{altitudeStatus}</p>{/if}
        {#if overlay === 'radar'}<p class="small">Радар — наблюдения, не высотный прогноз. В отдельных версиях Windy доступ из плагина может быть ограничен.</p>{/if}
        {#if offlineStatus}<p class="info">{offlineStatus}</p>{/if}
        <p class="small">TAS по умолчанию — 450 kt. ETA рассчитывается без поправки на ветер. Карта Windy синхронизируется с ETD и FL.</p>
        <p class="small">Перед открытием штатного Route Planner карта синхронизируется с ETD и FL. Его внутренние скорость и времена по точкам не задаются через публичный API; их необходимо проверить в самом Windy.</p>
        </div>
      </details>
      {#if timeWaypoints.length}
      <details class="fr-settings-group">
        <summary>ETA по точкам ({timeWaypoints.length})</summary>
        <div class="fr-settings-body">
        <p class="small">Выбери точку, чтобы посмотреть погоду на карте на ожидаемое время её пролёта и заданном эшелоне. Расчёт: расстояние по известной геометрии / TAS, без ветровой поправки.</p>
        <div class="scrolltable"><table><thead><tr><th>Точка</th><th>ETA UTC</th><th>NM от вылета</th><th>Прогноз Windy</th></tr></thead><tbody>
          {#each timeWaypoints as wp,i}
            <tr><td>{wp.label}</td><td>{wp.eta.toISOString().slice(11,16)}Z</td><td>{Math.round(wp.distanceNm)}</td>
              <td><button type="button" on:click={() => selectRouteWaypoint(i)}>Показать</button></td></tr>
          {/each}
        </tbody></table></div>
        </div>
      </details>
      {/if}
      <details class="fr-settings-group">
        <summary>Диагностика маршрута</summary>
        <div class="fr-settings-body">
        <h3>Диагностика маршрута</h3>
              <p class="small">Координаты, разрывы, неоднозначные FIX, нераспознанные трассы и данные экспорта.</p>
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

              {#if parsed && !canExportRoute}
                <div class="warning" role="alert"><b>Полный маршрут не подтверждён.</b> {routeExportWarning}. GPX содержит отдельные подтверждённые участки; планировщик может открыть только самый длинный непрерывный участок.
                  <details><summary>Причины неполного маршрута</summary><ul>{#each routeIssues(parsed) as issue}<li>{issue}</li>{/each}</ul></details>
                </div>
              {/if}
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Модель, эшелон и время Windy</summary>
        <div class="fr-settings-body">
        <h3>Модель, высоты и время Windy</h3>
              <div class="twofields">
                <div><label for="fr-model">Модель погоды</label><select id="fr-model" bind:value={model} on:change={setWeatherLayer}>
                  <option value="ecmwf">ECMWF</option><option value="gfs">GFS</option>
                </select></div>
                <div><label for="fr-apply-level">Выбранный эшелон</label><button id="fr-apply-level" type="button" class="full" on:click={setWeatherLayer}>Показать FL{fl}</button></div>
              </div>
              <div class="btnrow"><button type="button" on:click={setMapToDeparture}>Время Windy = ETD</button></div>
              <p class="small">Высота на карте соответствует ближайшему доступному изобарическому уровню. Для радара эшелон не применяется.</p>
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Офлайн-отчёт и снимок карты</summary>
        <div class="fr-settings-body">
        <label for="fr-report-shot">Снимок карты (PNG/JPEG/WebP)</label>
        <input id="fr-report-shot" type="file" accept="image/*" on:change={onOfflineScreenshotChange} />
        {#if offlineImageUrl}
          <div class="fr-shot-preview"><img alt="Выбранный снимок карты Windy" src={offlineImageUrl}/><span>{offlineImageName} · снимок включён в отчёт</span></div>
        {:else}
          <p class="warning">Без снимка HTML и PDF содержат только схему маршрута, без реального погодного слоя Windy.</p>
        {/if}
        <p class="small">Поставь на карте нужный слой, время и масштаб. Сделай скриншот на iPad и выбери его здесь. Снимок обрабатывается локально.</p>
        <h3>Дополнительно: офлайн-отчёт</h3>
              <div class="twofields">
                <div><label for="fr-report-overlay">Быстрый выбор слоя</label>
                  <select id="fr-report-overlay" bind:value={offlineOverlay} on:change={showReportWeatherLayer}>
                    <option value="thunder">Грозы</option>
                    <option value="turbulence">Турбулентность</option>
                  </select></div>
                <div><label for="fr-report-map">Показать этот слой</label><button id="fr-report-map" type="button" class="full" on:click={showReportWeatherLayer}>Показать на карте</button></div>
              </div>
              <p class="small">HTML/PDF сохраняет схему маршрута, приложенный скриншот выбранной карты и прогноз Open-Meteo, если он уже загружен. Снимок автоматически не создаётся.</p>
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Прогноз и таблицы FL300–FL400</summary>
        <div class="fr-settings-body">
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
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Навигационная база данных</summary>
        <div class="fr-settings-body">
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
        </div>
      </details>
    </div>
  </details>
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
    <details class="fr-profile-note fr-profile-note-details"><summary>Ограничения и источники прогноза</summary><p>Точки расчётные, время UTC · нажми на точку для смены времени Windy. Профиль Open-Meteo, а не встроенный Route Planner Windy. Тропопауза — приблизительная диагностическая оценка, не официальный SIGWX.</p></details>
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
  import {applyWindyAltitude} from './flightAltitude';
  import {buildWindyPlannerRequest,makeRouteGpx,routeIssues} from './routePlanner';
  import {installPlannerPointNames,clearPlannerPointNames} from './plannerPointNames';
  import {buildOfflineBrief} from './offlineReport';
  import type {WeatherOverlayName} from './offlineReport';
  import type {ParsedRoute} from './navdb';
  import type {WeatherRow,Sample} from './weather';
  let routeText='EHAM DCT EDDF DCT LTFM DCT OMDB';
  let status='Загрузка базы ещё не началась';
  const repoUrl = NAVDATA_GITHUB_REPO;
  let githubCycle='';
  let githubGenerated='';
  let githubPoints=0;
  let githubVertices=0;
  let parsed:ParsedRoute|null=null;
  let routeExportWarning='';
  let canExportRoute=false;
  $: {
    const r=parsed;
    routeExportWarning=!r?'сначала построй маршрут':
      r.points.length<2?'найдено менее двух точек':
      r.gaps.length?`разрывы: ${r.gaps.map(g=>g.from+'–'+g.to).join(', ')}`:
      r.unresolved.length?`неизвестные точки: ${r.unresolved.join(', ')}`:
      r.airwayNames.length?`неразвёрнутые ATS: ${r.airwayNames.join(', ')}`:
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
  let offlineOverlay:'thunder'|'turbulence'='thunder';
  let offlineImageUrl='';
  let offlineImageName='';
  let offlineStatus='';
  let altitudeStatus='';
  let altitudeRequestId=0;
  let altitudeTimer:ReturnType<typeof setTimeout>|null=null;
  let timeWaypoints:Sample[]=[];

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
  const clearRoute=()=>{clearPlannerPointNames();clearMap();routeText='';parsed=null;labeledCount=0;weather=[];timeWaypoints=[];profileOpen=false;status='Маршрут очищен';};
  function runRoute():void {
    clearPlannerPointNames();clearMap();weather=[];profileOpen=false;parsed=parseRoute(routeText);
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
    refreshWaypointSchedule();
    syncWindyTimestamp(departureDate(),false);
  }
  /** Set altitude immediately, then retry once after Windy rebuilds overlay availability. */
  function updateWindyAltitude(requestId=altitudeRequestId):void {
    if(requestId !== altitudeRequestId) return;
    try {
      const actualOverlay=String(store.get('overlay')??'');
      if(actualOverlay !== overlay) {
        altitudeStatus=`Windy сейчас показывает ${actualOverlay || 'неизвестный слой'}; выбор ${overlay} может быть недоступен.`;
        return;
      }
      const result=applyWindyAltitude(store as any,overlay,Number(fl));
      altitudeStatus=result.note;
      if(result.mode==='two-dimensional') {
        altitudeStatus+=` Эшелон FL${Math.round(Number(fl))} для этого слоя не применяется.`;
      } else if(!result.accepted) {
        altitudeStatus+=' Проверь доступность слоя/диапазона в Windy.';
      }
    } catch(err) {altitudeStatus='Не удалось выбрать высоту в Windy: '+String(err);}
  }
  function setWeatherLayer():void {
    if(altitudeTimer!==null) {clearTimeout(altitudeTimer);altitudeTimer=null;}
    const requestId=++altitudeRequestId;
    if(overlay !== 'radar') store.set('product',model as any);
    store.set('overlay',overlay as any);
    updateWindyAltitude(requestId);
    // On Windy, availLevels / levelsRange can update asynchronously after product and overlay.
    altitudeTimer=setTimeout(()=>{updateWindyAltitude(requestId);altitudeTimer=null;},220);
    const actual=store.get('overlay');
    status=actual===overlay
      ? `Windy: ${overlay}${overlay==='radar'?' (наблюдения)':`, ${model}`}; FL${fl} — ${altitudeStatus}`
      : `Windy не переключил слой на ${overlay}; проверь доступность слоя в этой версии Windy.`;
  }
  function flightLevelChanged(event:Event):void {
    const next=Number((event.currentTarget as HTMLInputElement).value);
    if(!Number.isFinite(next)||next<10||next>450) return;
    fl=next;
    flightInputsChanged();
    setWeatherLayer();
  }
  function refreshWaypointSchedule():void {
    const departure=departureDate();
    const r=parsed;
    const validRoute=!!r && r.points.length>=2 && !r.gaps.length && !r.unresolved.length && !r.airwayNames.length && r.segments.length===1;
    if(!validRoute || Number.isNaN(departure.getTime()) || !(Number(tas)>=100&&Number(tas)<=700)) { timeWaypoints=[];return; }
    try {timeWaypoints=generateWaypointSamples(r!.points,departure,Number(tas));}
    catch(err){console.warn('Could not generate waypoint ETA',err);timeWaypoints=[];}
  }
  function selectRouteWaypoint(index:number):void {
    const wp=timeWaypoints[index];
    if(!wp)return;
    syncWindyTimestamp(wp.eta);
    // Do not change the route geometry, zoom, or the user's chosen layer.
    updateWindyAltitude();
    status=`${wp.label}: ETA ${wp.eta.toISOString().slice(0,16).replace('T',' ')} UTC · FL${fl} · TAS ${tas} kt (без ветра).`;
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

  /** Open Windy's own planner in the running app, without external navigation. */
  function openNativeRoutePlanner():void {
    if(!parsed) { status='Сначала построй маршрут'; return; }
    const date=departureDate();
    if(Number.isNaN(date.getTime()) || !(Number(tas)>=100&&Number(tas)<=700)) {
      status='Проверь дату/время вылета UTC и TAS (100–700 kt)'; return;
    }
    let removeNames:(()=>void)|undefined;
    try {
      // Use the parser-selected coordinates automatically; ambiguity remains visible.
      const request=buildWindyPlannerRequest(parsed,true);
      syncWindyTimestamp(date,false);
      // Native planner accepts geometry/view; keep the global Windy map aligned
      // with the selected flight level, while not claiming to set private leg fields.
      updateWindyAltitude();
      const suffix=request.partial
        ?` Передаётся только участок ${request.from} → ${request.to}; это НЕ весь маршрут.`
        :parsed.ambiguous.length?' Координаты неоднозначных FIX требуют проверки.':'';
      // rqstOpen is a request, not confirmation that this Windy build opened it.
      status=`Запрошен Route Planner внутри Windy: ${request.verticesSent} координат.`+suffix;
      // Own lifecycle: these captions must survive this Svelte pane's onDestroy.
      removeNames=installPlannerPointNames(map,bcast,request.mapPoints);
      bcast.emit('rqstOpen','rplanner',request.params);
    } catch(err) {
      removeNames?.();
      status='Не удалось открыть в Windy: '+String(err)+'. Можно попробовать GPX по отдельным подтверждённым участкам.';
    }
  }
  function downloadPlannerGpx():void {
    if(!parsed){status='Сначала построй маршрут';return;}
    try {
      const partial=!canExportRoute;
      const content=makeRouteGpx(parsed,{allowPartial:partial,acceptAmbiguous:true});
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

  function showReportWeatherLayer():void {
    overlay=offlineOverlay;
    setWeatherLayer();
    offlineStatus=`Выбран слой «${offlineOverlay==='thunder'?'Грозы':'Турбулентность'}». Установи время карты Windy и сделай снимок экрана iPad, затем выбери снимок выше.`;
  }
  async function onOfflineScreenshotChange(event:Event):Promise<void> {
    const file=(event.currentTarget as HTMLInputElement).files?.[0];
    if(!file)return;
    offlineImageUrl='';offlineImageName='';
    if(file.size>15*1024*1024) {offlineStatus='Снимок больше 15 МБ. Сохрани уменьшенную копию и выбери её.';return;}
    try {
      // iPad Files can supply images with an empty MIME. Validate file signatures,
      // not only file extensions or the iOS-provided type.
      const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
      const isPng=head.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>head[i]===n);
      const isJpg=head[0]===255&&head[1]===216&&head[2]===255;
      const isWebp=head.length>=12&&[82,73,70,70].every((n,i)=>head[i]===n)&&
        [87,69,66,80].every((n,i)=>head[8+i]===n);
      const mime=isPng?'image/png':isJpg?'image/jpeg':isWebp?'image/webp':null;
      if(!mime)throw Error('Нужен PNG, JPEG или WebP (не HEIC/SVG/PDF).');
      const content=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||''));
        reader.onerror=()=>reject(Error('Не удалось прочитать снимок'));
        reader.readAsDataURL(file);
      });
      const comma=content.indexOf(',');
      if(comma<0||!/^data:[^,]*;base64,/i.test(content.slice(0,comma+1)))throw Error('Некорректное изображение');
      offlineImageUrl=`data:${mime};base64,${content.slice(comma+1)}`;
      offlineImageName=file.name;
      offlineStatus='Снимок добавлен в локальный отчёт. Файл не отправляется в сеть.';
    } catch(err){offlineStatus='Ошибка снимка: '+String(err);}
  }
  function offlineHtml():string {
    if(!parsed)throw Error('Сначала построй маршрут.');
    if(!parsed.segments.some(s=>s.length>1))throw Error('Нет непрерывного подтверждённого участка с двумя координатами.');
    const etd=departureDate();
    if(Number.isNaN(etd.getTime()))throw Error('Неверная дата или время ETD UTC.');
    if(!(Number(tas)>=100&&Number(tas)<=700))throw Error('TAS должна быть от 100 до 700 kt.');
    const raw=Number(store.get('timestamp'));
    const time=Number.isFinite(raw)&&raw>0?new Date(raw):etd;
    return buildOfflineBrief({
      route:parsed,routeText,overlay:overlay as WeatherOverlayName,model,
      mapTimeUtc:time.toISOString().slice(0,16).replace('T',' '),
      departureUtc:etd.toISOString().slice(0,16).replace('T',' '),
      tasKt:Number(tas),fl:Number(fl),
      image:offlineImageUrl?{dataUrl:offlineImageUrl,filename:offlineImageName}:null,
      forecastRows:weather,
      createdAtUtc:new Date().toISOString().slice(0,16).replace('T',' ')
    });
  }
  function saveOfflineHtml():void {
    try {
      const html=offlineHtml();
      const file=new File([html],'windy-route-offline.html',{type:'text/html;charset=utf-8'});
      if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[file]}))) {
        offlineStatus='Открылось системное меню: выбери «Сохранить в Файлы». HTML содержит снимок и работает без интернета.';
        void navigator.share({files:[file]}).catch(err=>{offlineStatus='Поделиться не удалось: '+String(err)+'. Попробуй браузер Safari.';});
        return;
      }
      const url=URL.createObjectURL(file);
      const link=document.createElement('a');link.href=url;link.download=file.name;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      offlineStatus='HTML готов. Если встроенный браузер не сохранил его, открой плагин через Safari.';
    } catch(err){offlineStatus='Не удалось создать HTML: '+String(err);}
  }
  function openOfflinePrint():void {
    try {
      const html=offlineHtml();
      // Open synchronously from the button gesture: Safari may block delayed popups.
      const win=window.open('','_blank');
      if(!win)throw Error('Windy/iPad заблокировал новое окно. Сохрани HTML и открой его в Safari.');
      win.document.open();win.document.write(html);win.document.close();
      offlineStatus='Открыта версия для печати. Нажми «Печать / сохранить PDF», затем выбери сохранение PDF в Safari/iPadOS.';
    } catch(err){offlineStatus='PDF: '+String(err);}
  }
  function flightInputsChanged():void {
    weather=[];profileOpen=false;activeProfileIndex=0;
    if(!(Number(tas)>=100 && Number(tas)<=700)) {status='TAS должна быть в диапазоне 100–700 kt';return;}
    refreshWaypointSchedule();
    syncWindyTimestamp(departureDate());
  }
  function selectProfilePoint(index:number):void {
    if(index<0 || index>=weather.length)return;
    activeProfileIndex=index;
    syncWindyTimestamp(weather[index].sample.eta);
    updateWindyAltitude();
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
    try { runRoute();setWeatherLayer(); }
    catch(err) { console.error('Initial map rendering failed',err);status='Не удалось нарисовать маршрут: '+String(err); }
    // On opening Windy, use the last published GitHub snapshot automatically.
    // Failures are visible and never silently replaced with an alleged full AIRAC database.
    (async()=>{await updateHosted();await reloadSources();})();
  });
  onDestroy(()=>{if(altitudeTimer!==null) clearTimeout(altitudeTimer);clearMap();});
</script>
<style lang="less">
  .flightplanner .fr-main-stack {display:flex;flex-direction:column;gap:12px;margin:10px 0 14px;}
  .flightplanner .fr-main-card {border:1px solid #576371;border-radius:11px;background:#26323d;padding:13px 13px 11px;min-width:0;}
  .flightplanner .fr-main-card h3 {font-size:15px;margin:0 0 10px;color:#f7f8fb;}
  .flightplanner .fr-main-card .btnrow {margin-bottom:3px;}
  .flightplanner .fr-param-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;}
  .flightplanner .fr-param-grid>div {min-width:0;}
  .flightplanner .fr-param-grid input {color-scheme:dark;min-width:0;}
  .flightplanner .fr-action-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:6px 0 12px;}
  .flightplanner .fr-action-grid button {min-width:0;min-height:42px;white-space:normal;text-align:center;}
  .flightplanner .fr-inline-details {border-top:1px solid #4b5a69;margin-top:10px;padding-top:10px;}
  .flightplanner .fr-inline-details>summary {font-weight:600;color:#dbeaf7;padding:3px 0;}
  .flightplanner .fr-settings {border:1px solid #58616b;border-radius:9px;margin:4px 0 15px;background:#212b35;overflow:hidden;}
  .flightplanner .fr-settings>summary {padding:13px;font-size:14px;font-weight:700;background:#2f3c49;cursor:pointer;}
  .flightplanner .fr-settings[open]>summary {border-bottom:1px solid #58616b;}
  .flightplanner .fr-settings-inner {padding:12px;min-width:0;}
  .flightplanner .fr-settings-inner>h3:first-child {margin-top:0;}
  .flightplanner .fr-settings-group {border:1px solid #4b5664;border-radius:8px;margin:8px 0;background:#26313c;overflow:hidden;}
  .flightplanner .fr-settings-group>summary {padding:11px 12px;font-size:13px;font-weight:600;cursor:pointer;}
  .flightplanner .fr-settings-group[open]>summary {border-bottom:1px solid #4b5664;}
  .flightplanner .fr-settings-body {padding:8px 12px 12px;min-width:0;}
  .flightplanner .fr-settings-body>h3:first-child {margin-top:0;}
  .fr-profile-note-details>summary {cursor:pointer;font-weight:600;}
  @media(max-width:380px) {.flightplanner .fr-action-grid {grid-template-columns:1fr;}}

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
  .flightplanner .fr-shot-preview {display:flex;align-items:center;gap:9px;margin:9px 0;color:#cddfea;font-size:11px;}
  .flightplanner .fr-shot-preview img {max-width:90px;max-height:70px;object-fit:contain;border:1px solid #68798a;border-radius:4px;}
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
