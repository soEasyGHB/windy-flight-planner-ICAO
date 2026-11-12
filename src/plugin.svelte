<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content flightplanner">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>
  <div class="fr-main-stack">
    <section class="fr-main-card fr-main-card--light" aria-labelledby="fr-section-route">
      <h3 id="fr-section-route">Ввод маршрута</h3>
      <label for="fr-route-input">Маршрут OFP / ICAO</label>
      <textarea id="fr-route-input" bind:value={routeText} on:input={routeInputChanged} rows="4" spellcheck="false" placeholder="EHAM DCT EDDF DCT LTFM DCT OMDB"></textarea>
      <div class="btnrow">
        <button type="button" class="primary" on:click={runRoute}>Построить маршрут</button>
        <button type="button" on:click={clearRoute}>Очистить</button>
      </div>
    </section>

    <section class="fr-main-card fr-main-card--light" aria-labelledby="fr-section-flight">
      <h3 id="fr-section-flight">Время вылета UTC</h3>
      <div class="fr-param-stack">
        <div>
          <label for="fr-etd-date">Дата вылета (UTC)</label>
          <input id="fr-etd-date" type="date" bind:value={etdDate} on:change={flightInputsChanged} />
        </div>
        <div>
          <label for="fr-etd-time">Время вылета (UTC)</label>
          <input id="fr-etd-time" type="time" step="60" bind:value={etdTime} on:change={flightInputsChanged} />
        </div>
      </div>
    </section>

    <section class="fr-main-card fr-main-card--light" aria-labelledby="fr-section-weather">
      <h3 id="fr-section-weather">Выбор слоя погоды</h3>
      <label for="fr-overlay">Только: гроза, осадки, турбулентность, радар</label>
      <select id="fr-overlay" bind:value={overlay} on:change={setWeatherLayer}>
        <option value="thunder">Грозы</option>
        <option value="rain">Осадки</option>
        <option value="turbulence">Турбулентность</option>
        <option value="radar">Радар</option>
      </select>
    </section>

    <section class="fr-main-card fr-main-card--light fr-main-card--analysis" aria-labelledby="fr-section-our-planner">
      <h3 id="fr-section-our-planner">Наш планировщик полёта</h3>
      <div class="fr-action-grid fr-action-grid--single">
        <button type="button" class="primary" disabled={busy} on:click={openWeatherProfile}>Построить метеопрофиль и подобрать эшелоны</button>
      </div>
      {#if weather.length}
        <div class="fr-recommended-inline">
          {#each profileViz.recommendations as rec (rec.parity)}
            <span>{rec.parity==='even'?'Чётный':'Нечётный'}: FL{rec.fl} ({rec.averageTailwindKt>=0?'+':''}{rec.averageTailwindKt} kt)</span>
          {/each}
        </div>
      {/if}
    </section>
    <section class="fr-main-card fr-main-card--light" aria-labelledby="fr-section-export">
      <h3 id="fr-section-export">Планировщик полёта</h3>
      <div class="fr-action-grid fr-action-grid--single">
        <button type="button" disabled={busy} on:click={downloadPlannerGpx}>Скачать GPX файл маршрута</button>
        <button type="button" class="primary" disabled={busy} on:click={openNativeRoutePlanner}>Открыть планировщик полёта</button>
      </div>
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
        <p class="small">TAS фиксирована: 450 kt. Эшелон не вводится вручную: отдельно рассчитываются метеорологические рекомендации для чётных и нечётных FL330–390. ETA приблизительный, без ATS и ветровой поправки. Таблица: Open-Meteo GFS напрямую, без API-ключа и Vercel. Данные карты Windy могут отличаться.</p>
        <p class="small">Перед открытием штатного Route Planner карта синхронизируется с ETD. Его внутренние параметры не задаются через публичный API; проверь их в Windy.</p>
        </div>
      </details>
      {#if timeWaypoints.length}
      <details class="fr-settings-group">
        <summary>ETA по точкам ({timeWaypoints.length})</summary>
        <div class="fr-settings-body">
        <p class="small">Выбери точку, чтобы посмотреть погоду на карте на ожидаемое время её пролёта и заданном эшелоне. Расчёт: расстояние по известной геометрии / TAS, без ветровой поправки.</p>
        <div class="scrolltable"><table><thead><tr><th>Точка</th><th>ETA UTC</th><th>NM от вылета</th><th>Карта Windy</th></tr></thead><tbody>
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
        <p class="small">На карте показаны прямые линии между распознанными именованными точками OFP. ATS-трассы целиком пропускаются, включая Y12. Геометрия и фактическая дальность пролёта по ATS не восстанавливаются; ETA ориентировочные. Не использовать для навигации.</p>
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
        <summary>Модель карты и время Windy</summary>
        <div class="fr-settings-body">
        <h3>Модель карты и время Windy</h3>
              <div class="twofields">
                <div><label for="fr-model">Модель погоды</label><select id="fr-model" bind:value={model} on:change={setWeatherLayer}>
                  <option value="ecmwf">ECMWF</option><option value="gfs">GFS</option>
                </select></div>
                <div><label>Карта Windy</label><span class="small">Высота карты выбирается автоматически после прогноза</span></div>
              </div>
              <div class="btnrow"><button type="button" on:click={setMapToDeparture}>Время Windy = ETD</button></div>
              <p class="small">Для карты Windy применяется ближайший поддерживаемый изобарический уровень. Для радара эшелон не применяется. Рекомендации FL — только ветер, не расчёт эксплуатационного эшелона.</p>
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
              <p class="small">HTML/PDF сохраняет схему маршрута, приложенный скриншот карты Windy и прогноз Open-Meteo GFS, если он загружен. Снимок автоматически не создаётся.</p>
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Источник прогноза: Open-Meteo GFS</summary>
        <div class="fr-settings-body">
          <p class="small"><b>Данные автоматически загружаются напрямую из Open-Meteo (NOAA GFS)</b> по координатам и ETA маршрутных точек. Ключ Windy Point Forecast и Vercel не требуются.</p>
          <p class="small">Для частного некоммерческого использования Open-Meteo предоставляет бесплатный API с лимитами запросов и обязательной атрибуцией CC BY 4.0. Для коммерческого применения нужен подходящий тариф/разрешение. <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer">Условия Open-Meteo</a>.</p>
          <p class="small">Ветер и температура берутся на изобарических поверхностях GFS. ISA и оптимальные по продольному ветру FL — расчётные величины; оценка тропопаузы использует модельные геопотенциальные высоты. Это не официальный метеобрифинг.</p>
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Прогноз и таблицы FL300–FL400</summary>
        <div class="fr-settings-body">
        <h3>Прогноз по маршруту и высотам</h3>
          <p class="small">Метеоразрез и таблица используют Open-Meteo GFS без ключа. Тропопауза вычисляется из того же временного профиля GFS по температуре и геопотенциальной высоте. Модель карты Windy может отличаться; это не официальный прогноз WAFS/SIGWX.</p>
          <div class="btnrow">
            <button type="button" class="primary" disabled={busy} on:click={openWeatherProfile}>{profileState==='loading'?'Загружаю профиль…':'Получить профиль и открыть'}</button>
            <button type="button" disabled={!weather.length} on:click={downloadWeather}>CSV отчёт</button>
          </div>
          {#if profileFeedback}
            <p class:warning={profileState==='error'} class="fr-profile-feedback" role="status" aria-live="polite">{profileFeedback}</p>
          {/if}
          {#if weather.length}
            <h4>Модельный прогноз на FL{weatherFL} (интерполяция из Open-Meteo GFS)</h4>
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
            <p class="small">Таблица: Open-Meteo, NOAA GFS, без ключа. Значения FL между изобарическими уровнями интерполированы. Тропопауза приблизительно рассчитана по модельной вертикальной температуре и геопотенциальной высоте. Неофициальные данные; пропуски не замещаются вымышленными значениями.</p>
            <p class="small">* Индикаторы по упрощённым порогам: T от −20 до 0 °C и RH ≥80% (условия возможного обледенения); ветер ≥100 kt; CAPE &gt;1000 J/kg; разница скорости ветра ≥35 kt между соседними уровнями. Это <b>НЕ</b> прогноз фактического обледенения, CAT/турбулентности, гроз по трассе или опасных явлений по ICAO. Для решений используйте SIGMET, значимые карты, AIP, NOTAM и утверждённые источники.</p>
          {/if}
        </div>
      </details>
      <details class="fr-settings-group">
        <summary>Дополнительные действия</summary>
        <div class="fr-settings-body">
          <div class="fr-action-grid">
            <button type="button" class="primary" on:click={saveOfflineHtml}>Сохранить HTML офлайн</button>
            <button type="button" on:click={openOfflinePrint}>Открыть для PDF</button>
          </div>
          <div class="btnrow"><button type="button" disabled={busy} on:click={openWeatherProfile}>{profileState==='loading'?'Загружаю профиль…':'Получить ветер, T и ISA по точкам'}</button></div>
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
{#if profileOpen}
  <aside class="fr-profile-panel" aria-label="Графический вертикальный метеопрофиль маршрута">
    <header class="fr-profile-head">
      <div>
        <strong>Профиль по маршруту</strong>
        <span>ETD {etdDate} {etdTime} UTC · TAS {tas} · Open-Meteo GFS</span>
      </div>
      <button type="button" class="fr-profile-close" on:click={() => profileOpen=false} aria-label="Закрыть профиль">×</button>
    </header>
    {#if weather.length}
    <div class="fr-profile-selected-data">
      <strong>{weather[activeProfileIndex]?.sample.label ?? '—'}</strong>
      <span>Модельные параметры FL{weatherFL}</span>
      {#if profileViz.waypointWinds[activeProfileIndex]}
        <span class={profileViz.waypointWinds[activeProfileIndex]?.kind==='tail'?'fr-wind-tail-label':profileViz.waypointWinds[activeProfileIndex]?.kind==='head'?'fr-wind-head-label':'fr-wind-neutral-label'}>
          {#if profileViz.waypointWinds[activeProfileIndex]?.kind==='tail'}
            → Попутная {profileViz.waypointWinds[activeProfileIndex]?.componentKt}
          {:else if profileViz.waypointWinds[activeProfileIndex]?.kind==='head'}
            ← Встречная {profileViz.waypointWinds[activeProfileIndex]?.componentKt}
          {:else}
            <span class="fr-wind-zero-dash" title="Чисто боковой ветер: продольная составляющая отсутствует">—</span>
          {/if}
        </span>
        <span>Курс {Math.round(profileViz.waypointWinds[activeProfileIndex]?.courseDeg ?? 0)}°T · ветер {weather[activeProfileIndex]?.atFl?.windDir ?? '—'}° / {weather[activeProfileIndex]?.atFl?.windKt ?? '—'}</span>
      {:else}
        <span class="fr-wind-zero-dash" title="Нет данных о продольной составляющей ветра">—</span>
      {/if}
      <span>T: {weather[activeProfileIndex]?.atFl?.temp ?? '—'}°C</span>
      <span>ISA Δ: {weather[activeProfileIndex]?.atFl?.isaDeviationC == null ? '—' : `${weather[activeProfileIndex].atFl.isaDeviationC > 0 ? '+' : ''}${weather[activeProfileIndex].atFl.isaDeviationC}`}°C</span>
      <span>{profileViz.tropopauseDescription}</span>
    </div>
    <div class="fr-profile-body">
      <div class="fr-profile-scroll" aria-label="Профиль ISA, ветра и тропопаузы — прокручивается горизонтально">
        <svg class="fr-profile-svg" xmlns="http://www.w3.org/2000/svg"
          width={profileViz.width} height={profileViz.height} viewBox={`0 0 ${profileViz.width} ${profileViz.height}`}
          role="img" aria-label={`Метеопрофиль FL330–390; рекомендуемые чётный и нечётный эшелоны; расстояние ${Math.round(profileViz.totalNm)} NM`}>
          <defs>
            {#each profileViz.bands as band (band.level)}
              <linearGradient id={`fr-isa-gradient-${band.level}`} x1="0%" y1="0%" x2="100%" y2="0%">
                {#each band.stops as stop, i (i)}
                  <stop offset={`${stop.offset}%`} stop-color={stop.color}/>
                {/each}
              </linearGradient>
            {/each}
          </defs>
          <rect x="0" y="0" width={profileViz.width} height={profileViz.height} fill="#f3f6f8"/>
          <rect x={profileViz.left} y={profileViz.top-26}
            width={profileViz.right-profileViz.left}
            height={profileViz.bottom-profileViz.top+52} fill="#f7f6f3"/>
          {#each profileViz.bands as band (band.level)}
            <rect x={profileViz.left} y={band.y-26}
              width={profileViz.right-profileViz.left} height="52"
              fill={`url(#fr-isa-gradient-${band.level})`} opacity="0.93"/>
          {/each}
          {#each profileViz.levels as level (level)}
            <line class="fr-grid-horizontal" x1={profileViz.left} x2={profileViz.right}
              y1={yForFlightLevel(level)} y2={yForFlightLevel(level)}/>
            <text class="fr-axis-level" x="74" y={yForFlightLevel(level)+5} text-anchor="end">FL{level}</text>
          {/each}
          <line class="fr-profile-top-axis" x1={profileViz.left} x2={profileViz.right} y1={profileViz.top-26} y2={profileViz.top-26}/>
          {#each profileViz.ticks as tick (tick.distanceNm)}
            <line class="fr-axis-tick" x1={tick.x} x2={tick.x} y1={profileViz.top-28} y2={profileViz.bottom+26}/>
            <text class="fr-distance-tick" x={tick.x} y={profileViz.top-36} text-anchor="middle">{tick.label}</text>
          {/each}
          {#each profileViz.waypoints as waypoint, i (i)}
            <line class:fr-waypoint-active={i===activeProfileIndex} class="fr-waypoint-line"
              x1={waypoint.x} x2={waypoint.x} y1={profileViz.top-42} y2={profileViz.bottom+26}/>
          {/each}
          {#each profileViz.isaContours as contour (contour.value)}
            {#each contour.segments as segment, i (i)}
              <polyline class="fr-isa-contour" points={segment.map(p=>`${p.x},${p.y}`).join(' ')}/>
            {/each}
            {#each contour.labels as item, i (i)}
              <text class="fr-isa-contour-label" x={item.x} y={item.y} text-anchor="middle">{item.text}</text>
            {/each}
          {/each}
          {#each profileViz.recommendations as rec (rec.parity)}
            <line class="fr-recommended-fl-line" class:fr-recommended-fl-odd={rec.parity==='odd'}
              x1={profileViz.left} x2={profileViz.right} y1={yForFlightLevel(rec.fl)} y2={yForFlightLevel(rec.fl)}/>
          {/each}
          {#each profileViz.components as component, i (i)}
            <g class={component.kind==='tail'?'fr-component-tail':'fr-component-head'}
              transform={`translate(${component.x},${component.y})`}>
              <title>FL{component.level} · курс {Math.round(component.courseDeg)}° истинный · ветер ОТ {Math.round(component.windFromDeg)}° / {Math.round(component.windKt)} · {component.kind==='tail'?'попутная':'встречная'} {component.componentKt} · боковая {component.crosswindKt}</title>
              {#if component.kind==='tail'}
                <path class="fr-component-arrow" d="M-17 -9 H13 M7 -15 L13 -9 L7 -3"/>
              {:else}
                <path class="fr-component-arrow" d="M17 -9 H-13 M-7 -15 L-13 -9 L-7 -3"/>
              {/if}
              <text class="fr-component-amount" x="0" y="11" text-anchor="middle">{component.componentKt}</text>
            </g>
          {/each}
          <rect class="fr-tropopause-band" x={profileViz.left} y={profileViz.tropopauseBandTop-4}
            width={profileViz.right-profileViz.left} height={profileViz.tropopauseBandBottom-profileViz.tropopauseBandTop+8} rx="4"/>
          <text class="fr-tropopause-band-label" x={profileViz.left+7} y={profileViz.tropopauseBandTop-10}>ТРОПОПАУЗА · отдельная шкала FL</text>
          {#each profileViz.tropopauseSegments as segment, i (i)}
            <polyline class="fr-tropopause-line" points={segment.map(m=>`${m.x},${m.y}`).join(' ')}/>
          {/each}
          {#each profileViz.tropopauseMarkers as marker, i (i)}
            <circle class="fr-tropopause-dot" cx={marker.x} cy={marker.y} r="2.8"/>
          {/each}
          {#if profileViz.tropopauseLabel}
            <g class="fr-tropopause-tag" transform={`translate(${Math.max(profileViz.left+110,Math.min(profileViz.right-110,profileViz.tropopauseLabel.x))},${profileViz.tropopauseBandTop-14})`}>
              <rect x="-105" y="-12" width="210" height="21" rx="8"/>
              <text x="0" y="3" text-anchor="middle">{profileViz.tropopauseDescription}</text>
            </g>
          {:else}
            <text class="fr-tropopause-outside" x={profileViz.left+12} y={profileViz.tropopauseBandTop+22}>{profileViz.tropopauseDescription}</text>
          {/if}
          {#each profileViz.waypoints as waypoint, i (i)}
            <g class="fr-waypoint-target" role="button" tabindex="0"
              aria-label={`Точка ${waypoint.label}, ETA ${waypoint.etaUtc}. Показать время на карте`}
              on:click={() => selectProfilePoint(i)}
              on:keydown={(e) => { if(e.key==='Enter'||e.key===' ') { e.preventDefault();selectProfilePoint(i); } }}>
              <title>{waypoint.label} · {waypoint.etaUtc} · {Math.round(waypoint.distanceNm)} NM</title>
              <path class="fr-waypoint-leader" d={`M${waypoint.x} ${profileViz.top-42} L${waypoint.labelX} ${waypoint.labelY+4}`}/>
              <rect class="fr-waypoint-nameplate" class:fr-waypoint-nameplate-active={i===activeProfileIndex}
                x={waypoint.labelX-waypoint.labelWidth/2} y={waypoint.labelY-12}
                width={waypoint.labelWidth} height="17" rx="4"/>
              <text class="fr-waypoint-code" x={waypoint.labelX} y={waypoint.labelY} text-anchor="middle">{waypoint.label}</text>
            </g>
          {/each}
          <text class="fr-route-bottom-label" x={profileViz.left} y={profileViz.bottom+48}>Точки OFP · расстояния и ETA приблизительные · рекомендации только по ветру</text>
        </svg>
      </div>
    </div>
    <footer class="fr-profile-flight-summary">
      <span><b>ETD UTC</b> {etdDate} {etdTime}</span>
      <span><b>Расстояние</b> {Math.round(profileViz.totalNm).toLocaleString('ru-RU')} NM</span>
      <span><b>Расчётное время</b> {formatFlightDuration(profileViz.totalNm, tas)}</span>
      {#each profileViz.recommendations as rec (rec.parity)}
        <span class="fr-profile-recommendation"><b>{rec.parity==='even'?'Чётный':'Нечётный'} — рекомендуемый эшелон</b> FL{rec.fl} ({rec.averageTailwindKt>=0?'+':''}{rec.averageTailwindKt} kt)</span>
      {/each}
      {#if !profileViz.recommendations.length}<span><b>Рекомендованные эшелоны</b> недостаточно данных ветра</span>{/if}
      <span><b>TAS</b> {tas}</span>
      <span class="fr-profile-tropopause-status">{profileViz.tropopauseDescription}</span>
    </footer>
    <details class="fr-profile-note fr-profile-note-details">
      <summary>Источники и ограничения прогноза</summary>
      <p>Прогноз температуры и ветра — Open-Meteo GFS напрямую (не данные карты Windy), ISA рассчитывается по отклонению от стандартной атмосферы. Тропопауза оценена по температуре и геопотенциальной высоте того же GFS; показана на отдельной шкале, чтобы не искажать FL330–390. Голубые линии — лучший средний продольный ветер для чётных и нечётных эшелонов среди FL330–390; аэродинамика, расход, вес, ограничения воздушного пространства, направление полёта по правилам эшелонирования и безопасность не учитываются. Геометрия прямолинейная между FIX, без ATS, ETA без учёта ветра. Не для оперативной навигации или выбора разрешённого эшелона.</p>
    </details>
    {:else}
      <div class="fr-profile-empty" role="status" aria-live="polite">
        <strong>{profileState==='loading'?'Загрузка данных по маршруту…':'Профиль не построен'}</strong>
        <p>{profileFeedback || 'Укажите маршрут и дату вылета, затем повторите запрос.'}</p>
        {#if profileState==='error'}
          <button type="button" class="fr-profile-retry" disabled={busy} on:click={openWeatherProfile}>Повторить запрос</button>
        {/if}
      </div>
    {/if}
  </aside>
{/if}
<script lang="ts">
  import bcast from '@windy/broadcast';
  import config from './pluginConfig';
  const {title} = config;
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { onMount,onDestroy } from 'svelte';
  import {loadDemo,loadOpenSources,airwayCount,parseNamedFixRoute,mapLabelPoints,totalPoints,sourceCount,loadGithubSnapshot,githubUploadUrl} from './navdb';
  import {NAVDATA_GITHUB_REPO} from './navdataConfig';
  import {generateWaypointSamples,flLevel,PRESSURES,standardAltitudeM,loadWeather} from './weather';
  import {applyWindyAltitude} from './flightAltitude';
  import {buildRouteProfile,yForFlightLevel} from './profileChart';
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
  let weatherFL=360;
  let busy=false;
  // Keep the map level internal; meteorological cruise recommendations are automatic.
  let overlay='thunder';
  let model='ecmwf';
  let fl=360;
  let tas=450;
  // Browser-local state: retained between plugin openings/reloads on the same device.
  const SAVED_FLIGHT_KEY='windy-flight-route-analyzer:flight:v1';
  function saveFlightInputs():void {
    try {
      window.localStorage.setItem(SAVED_FLIGHT_KEY,JSON.stringify({routeText,etdDate,etdTime}));
    } catch (_err) { /* Safari private mode / disabled storage: never block the plugin */ }
  }
  function restoreFlightInputs():void {
    try {
      const raw=window.localStorage.getItem(SAVED_FLIGHT_KEY);
      if(!raw)return;
      const saved=JSON.parse(raw) as {routeText?:unknown;etdDate?:unknown;etdTime?:unknown};
      if(typeof saved.routeText==='string'&&saved.routeText.length<=50000)routeText=saved.routeText;
      if(typeof saved.etdDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.etdDate))etdDate=saved.etdDate;
      if(typeof saved.etdTime==='string'&&/^\d{2}:\d{2}$/.test(saved.etdTime))etdTime=saved.etdTime;
    } catch (_err) { /* corrupted/blocked state: use defaults */ }
  }
  function routeInputChanged(event:Event):void {
    routeText=(event.currentTarget as HTMLTextAreaElement).value;
    parsed=null;
    weather=[];
    profileOpen=false;
    profileState='idle';
    profileFeedback='';
    saveFlightInputs();
  }
  const initialETD=new Date(Date.now()+2*3600000).toISOString().slice(0,16);
  let etdDate=initialETD.slice(0,10);
  let etdTime=initialETD.slice(11,16);
  let profileOpen=false;
  let profileState:'idle'|'loading'|'ready'|'error'='idle';
  let profileFeedback='';
  let activeProfileIndex=0;
  let offlineOverlay:'thunder'|'turbulence'='thunder';
  let offlineImageUrl='';
  let offlineImageName='';
  let offlineStatus='';
  let altitudeStatus='';
  let altitudeRequestId=0;
  let altitudeTimers:Array<ReturnType<typeof setTimeout>>=[];
  let timeWaypoints:Sample[]=[];

  const cruiseFlightLevels=[300,310,320,330,340,350,360,370,380,390,400];
  let profileViz:ReturnType<typeof buildRouteProfile>;
  $: profileViz=buildRouteProfile(weather,weatherFL);
  const profilePressureLevels=[500,400,300,200,150];
  let pointTotal=0,loadedSources=0,airways=0;
  const pressuresDescending=[...PRESSURES].reverse();
  const clearMap=()=>{
    // Broken/unavailable map layers must not stop the plugin panel from opening.
    for(const layer of [...lines, ...markers]) {
      try { map.removeLayer(layer); } catch (err) { console.warn('Could not remove route layer',err); }
    }
    lines=[];markers=[];
  };
  const clearRoute=()=>{clearPlannerPointNames();clearMap();routeText='';parsed=null;labeledCount=0;weather=[];timeWaypoints=[];profileOpen=false;status='Маршрут очищен';saveFlightInputs();};
  function runRoute():void {
    saveFlightInputs();
    clearPlannerPointNames();clearMap();weather=[];profileOpen=false;parsed=parseNamedFixRoute(routeText);
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
    status=`Упрощённая схема: ${Math.round(parsed.distanceNm)} NM по прямым между FIX; подписей: ${labeledCount}; разрывов: ${parsed.gaps.length}. ATS пропущены.`;
    refreshWaypointSchedule();
    syncWindyTimestamp(departureDate(),false);
  }
  /** Apply height only while this overlay request is current. */
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
  function cancelAltitudeRetries():void {
    for(const timer of altitudeTimers) clearTimeout(timer);
    altitudeTimers=[];
  }
  function setWeatherLayer(event?:Event):void {
    const selection=event?.currentTarget as HTMLSelectElement | undefined;
    if(selection?.id==='fr-overlay')overlay=selection.value;
    cancelAltitudeRetries();
    const requestId=++altitudeRequestId;
    if(overlay !== 'radar') store.set('product',model as any);
    store.set('overlay',overlay as any);
    // Overlay/model changes can reset the altitude later than the previous
    // single 220 ms retry. Reapply for a bounded 3-second initialization
    // window; never keep an indefinite timer fighting user controls.
    updateWindyAltitude(requestId);
    for (const delay of [180,600,1300,3000]) {
      const timer=setTimeout(()=>{
        if(requestId===altitudeRequestId) updateWindyAltitude(requestId);
        altitudeTimers=altitudeTimers.filter(t=>t!==timer);
      },delay);
      altitudeTimers.push(timer);
    }
    const actual=store.get('overlay');
    status=actual===overlay
      ? `Windy: ${overlay}${overlay==='radar'?' (наблюдения)':`, ${model}`}; FL${fl} — ${altitudeStatus}`
      : `Windy не переключил слой на ${overlay}; проверь доступность слоя в этой версии Windy.`;
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
  function formatFlightDuration(distanceNm:number,tasKt:number):string {
    if(!Number.isFinite(distanceNm)||!Number.isFinite(tasKt)||tasKt<=0)return '—';
    const minutes=Math.round(distanceNm/tasKt*60);
    return `${Math.floor(minutes/60)} ч ${String(minutes%60).padStart(2,'0')} мин`;
  }
  function flightInputsChanged(event?:Event):void {
    const input=event?.currentTarget as HTMLInputElement | undefined;
    if(input?.id==='fr-etd-date')etdDate=input.value;
    if(input?.id==='fr-etd-time')etdTime=input.value;
    saveFlightInputs();
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
    // Open the panel synchronously on the click, before network I/O or route checks.
    // Otherwise an invalid FIX or a failed forecast request silently does nothing.
    if(busy)return;
    weather=[];
    profileOpen=true;
    profileState='loading';
    profileFeedback='Проверяю маршрут и дату вылета…';
    await analyze();
    if(weather.length && profileState==='ready') {
      try {selectProfilePoint(0);}
      catch(err) {console.warn('Could not sync map time with first forecast waypoint',err);}
    }
  }
  async function analyze():Promise<void> {
    // The route may have been pasted after its last map rebuild.
    // Do not fetch using coordinates from a previous OFP.
    if(!parsed) {
      try {
        runRoute();
        // runRoute clears the previous profile; keep this user-requested panel open.
        profileOpen=true;
      }
      catch(err) {
        profileState='error';
        profileFeedback='Не удалось разобрать маршрут: '+String(err);
        status=profileFeedback;
        return;
      }
    }
    const currentRoute=parsed;
    // Read route data directly: the reactive canExportRoute value may not yet have
    // updated when runRoute() was called within this same click handler.
    const routeIssue=!currentRoute?'Маршрут не построен':
      currentRoute.points.length<2?'найдено менее двух точек':
      currentRoute.gaps.length?`разрывы: ${currentRoute.gaps.map(g=>g.from+'–'+g.to).join(', ')}`:
      currentRoute.unresolved.length?`неизвестные FIX: ${currentRoute.unresolved.join(', ')}`:
      currentRoute.airwayNames.length?`неразвёрнутые ATS: ${currentRoute.airwayNames.join(', ')}`:
      currentRoute.segments.length!==1?'нет непрерывного маршрута':'';
    if(routeIssue) {
      profileState='error';
      profileFeedback='Прогноз не построен: '+routeIssue+'. Открой «Настройки → Диагностика маршрута», исправь неизвестные FIX/разрывы и повтори запрос.';
      status=profileFeedback;
      return;
    }
    const date=departureDate();
    if(Number.isNaN(date.getTime()) || !(Number(tas)>=100 && Number(tas)<=700)) {
      profileState='error';
      profileFeedback='Проверь дату и время вылета UTC. TAS должна быть от 100 до 700 kt.';
      status=profileFeedback;
      return;
    }
    busy=true;
    weather=[];
    activeProfileIndex=0;
    try {
      const samples=generateWaypointSamples(currentRoute!.points,date,Number(tas));
      if(samples.length<2)throw Error('Найдено менее двух именованных точек маршрута.');
      profileFeedback=`Получаю прогноз: ${samples.length} именованных точек…`;
      weather=await loadWeather(samples,Number(fl),text=>{
        profileFeedback=text;
        status=text;
      });
      if(!weather.length)throw Error('Сервис прогноза не вернул данных по маршруту.');
      const even=buildRouteProfile(weather,360).recommendations.find(rec=>rec.parity==='even');
      fl=even?.fl??360; // Weather-only map alignment; NOT an aircraft flight-level selection.
      weatherFL=Number(fl);
      for(const row of weather){
        row.atFl=row.flightLevels[weatherFL]??null;
        row.flPressure=flLevel(weatherFL);
        row.alerts=[...(row.atFl?.indicators??[])];
      }
      profileState='ready';
      profileFeedback=`Open-Meteo GFS: ${weather.length} точек. Метеорологические рекомендации чётного/нечётного эшелона рассчитаны. Нажми на FIX, чтобы выбрать время карты.`;
      status=profileFeedback;
      // Windy time synchronisation is useful but must never hide a loaded profile.
      try {syncWindyTimestamp(date,false);}
      catch(err) {console.warn('Windy time synchronization failed after forecast load',err);}
    } catch(err) {
      weather=[];
      profileState='error';
      profileFeedback='Не удалось получить профиль Open-Meteo GFS: '+String(err)+'. Проверь подключение к интернету, корректность ETA (не более 16 дней) и попробуй повторить запрос.';
      status=profileFeedback;
      console.warn('Flight weather profile request failed',err);
    } finally {busy=false;}
  }
  function downloadWeather():void {
    if(!weather.length)return;
    const rows=[['point','lat','lon','nm','eta_utc','fl','temp_c','wind_kt','wind_dir','isa_deviation_c','tropopause_approx_fl','source'].join(',')];
    for(const w of weather) for(const f of cruiseFlightLevels) {
      const c=w.flightLevels[f];
      rows.push([w.sample.label,w.sample.lat.toFixed(5),w.sample.lon.toFixed(5),w.sample.distanceNm.toFixed(1),w.sample.eta.toISOString(),f,c?.temp??'',c?.windKt??'',c?.windDir??'',c?.isaDeviationC??'',w.tropopauseFL??'','Open-Meteo NOAA GFS (CC BY 4.0)'].join(','));
    }
    const a=document.createElement('a'),u=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.href=u;a.download='flight-weather-FL300-FL400.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
  export const onopen=()=>{
    if(parsed?.points.length) try { runRoute(); }
    catch(err) { console.error('Route rendering failed',err);status='Ошибка карты: '+String(err); }
    // Each opening starts on the thunderstorm layer (regardless of Windy's prior state).
    overlay='thunder';
    // Windy may reject a layer or model during client updates. Never let this
    // secondary map synchronization prevent the plugin pane from opening.
    try { setWeatherLayer(); }
    catch(err) { console.warn('Weather layer initialization failed',err);status='Плагин открыт, но слой карты не установлен: '+String(err); }
  };
  onMount(()=>{
    restoreFlightInputs();
    try { loadDemo();pointTotal=totalPoints();runRoute();setWeatherLayer(); }
    catch(err) { console.error('Initial data/map setup failed',err);status='Плагин открыт, но начальная настройка карты не завершена: '+String(err); }
    // On opening Windy, use the last published GitHub snapshot automatically.
    // Failures are visible and never silently replaced with an alleged full AIRAC database.
    (async()=>{await updateHosted();await reloadSources();})();
  });
  onDestroy(()=>{saveFlightInputs();cancelAltitudeRetries();clearMap();});
</script>
<style lang="less">
  .flightplanner .fr-main-stack {display:flex;flex-direction:column;gap:12px;margin:10px 0 14px;}
  .flightplanner .fr-main-card {border:1px solid #7e868f;border-radius:18px;background:#555e69;padding:16px 16px 14px;min-width:0;}
  .flightplanner .fr-main-card h3 {font-size:15px;margin:0 0 10px;color:#f8fafc;text-align:center;}
  .flightplanner .fr-main-card--light label {color:#f0f3f6;}
  .flightplanner .fr-main-card--light textarea, .flightplanner .fr-main-card--light input, .flightplanner .fr-main-card--light select {background:#727d89;color:#fff;border:1px solid #a0a9b2;}
  .flightplanner .fr-main-card--light button {min-height:44px;}
  .flightplanner .fr-main-card--light button:not(.primary) {background:#747c87;color:#fff;border-color:#a0a9b2;}
  .flightplanner .fr-main-card--light button.primary {background:#2f74b5;color:#fff;border-color:#2f74b5;}
  .flightplanner .fr-main-card .btnrow {margin-bottom:3px;}
  .flightplanner .fr-param-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;}
  .flightplanner .fr-param-stack {display:grid;grid-template-columns:1fr;gap:10px;}
  .flightplanner .fr-param-stack>div {min-width:0;max-width:100%;}
  .flightplanner #fr-etd-date,.flightplanner #fr-etd-time {
    box-sizing:border-box;display:block;width:190px;max-width:100%;min-width:0;
    height:39px;padding:7px 8px;font-size:13px;color-scheme:dark;
  }

  .flightplanner .fr-param-grid>div {min-width:0;}
  .flightplanner .fr-param-grid input {color-scheme:dark;min-width:0;}
  .flightplanner .fr-action-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:6px 0 12px;}
  .flightplanner .fr-action-grid--single {grid-template-columns:1fr;}
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
  .flightplanner .fr-profile-feedback {margin:8px 0 10px;font-size:11px;line-height:1.45;overflow-wrap:anywhere;color:#d7e9f8;}
  .fr-profile-empty {padding:16px 18px;min-height:105px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;color:#e1eaf5;}
  .fr-profile-empty strong {font-size:14px;}
  .fr-profile-empty p {margin:0;line-height:1.5;overflow-wrap:anywhere;}
  .fr-profile-retry {background:#176db7;border:1px solid #519fe3;border-radius:7px;color:white;padding:8px 14px;cursor:pointer;}
  .fr-profile-panel {position:fixed;z-index:8000;bottom:60px;left:0;right:0;
    padding:0;background:#eef2f4;color:#152334;border-top:3px solid #1876d2;
    box-shadow:0 -8px 28px rgba(0,0,0,.48);font:12px/1.35 system-ui,sans-serif;max-height:76vh;overflow:hidden;}
  .fr-profile-head {display:flex;justify-content:space-between;align-items:center;gap:12px;
    color:#ecf4fc;background:#1b2838;padding:10px 16px;}
  .fr-profile-head strong {display:block;font-size:15px;}
  .fr-profile-head span {display:block;margin-top:3px;font-size:11px;color:#a9bed2;}
  .fr-profile-close {background:#35495d;color:#fff;border:1px solid #6a7b8e;
    border-radius:5px;padding:5px 11px;cursor:pointer;font-size:16px;}
  .fr-profile-selected-data {display:flex;gap:14px;align-items:center;flex-wrap:wrap;
    padding:7px 16px;color:#263b4d;background:#dcebf7;border-bottom:1px solid #bdd6e9;font-size:11px;}
  .fr-profile-selected-data strong {color:#125fa7;font-size:12px;}
  .fr-profile-body {display:block;min-height:0;background:#f1f4f6;}
  .fr-profile-scroll {flex:1;min-width:0;overflow:auto;max-height:60vh;
    background:#f4f6f7;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
  .fr-profile-svg {display:block;min-width:max-content;font:11px system-ui,sans-serif;}
  .fr-grid-horizontal {stroke:#b8c1c7;stroke-width:.75;opacity:.55;}
  .fr-profile-top-axis {stroke:#7a8896;stroke-width:1;}
  .fr-axis-level {font-size:12px;fill:#455769;}
  .fr-axis-tick {stroke:#8d9daa;stroke-width:.7;stroke-dasharray:2 5;opacity:.75;}
  .fr-distance-tick {font-size:12px;fill:#697988;}
  .fr-waypoint-line {stroke:#c6463d;stroke-width:1;stroke-dasharray:4 4;opacity:.56;}
  .fr-waypoint-line.fr-waypoint-active {stroke:#a92b28;stroke-width:1.7;opacity:.96;}
  .fr-barb {opacity:.83;pointer-events:none;}
  .fr-component-tail,.fr-component-head {pointer-events:auto;cursor:help;}
  .fr-component-arrow {fill:none;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;opacity:.7;}
  .fr-component-amount {font-size:11px;font-weight:800;paint-order:stroke fill;stroke:#f4f5f1;stroke-width:2.3px;stroke-linejoin:round;}
  .fr-component-tail .fr-component-arrow {stroke:#69a292;}
  .fr-component-tail .fr-component-amount {fill:#4b8072;}
  .fr-component-head .fr-component-arrow {stroke:#c59a93;}
  .fr-component-head .fr-component-amount {fill:#9e746f;}
  .fr-wind-tail-label {font-weight:800;color:#12834d;}
  .fr-wind-head-label {font-weight:800;color:#bb2f3d;}
  .fr-wind-neutral-label {font-weight:700;color:#5d6c77;}
  .fr-wind-zero-dash {font-size:12px;color:#677783;}
  .fr-legend-tail,.fr-legend-head,.fr-legend-cross {display:inline-block;font-style:normal;font-size:15px;font-weight:900;line-height:1;}
  .fr-legend-tail {color:#12834d;}
  .fr-legend-head {color:#c0343d;}
  .fr-legend-cross {color:#64727e;}
  .fr-isa-annotation {fill:#604b47;font-size:11px;font-weight:650;
    paint-order:stroke;stroke:rgba(255,255,255,.75);stroke-width:2.1px;}
  .fr-recommended-fl-line {stroke:#69badd;stroke-width:2.2;opacity:.47;pointer-events:none;}
  .fr-recommended-fl-odd {stroke:#7ccce2;stroke-dasharray:7 4;opacity:.68;}
  .fr-isa-contour {stroke:#758a94;stroke-width:.8;stroke-dasharray:3 5;opacity:.55;fill:none;}
  .fr-isa-contour-label {font-size:10px;fill:#596d75;paint-order:stroke;stroke:rgba(255,255,255,.88);stroke-width:3px;font-weight:650;}
  .fr-tropopause-band {fill:#e9ecef;stroke:#b9c3ca;stroke-dasharray:2 5;}
  .fr-tropopause-band-label {fill:#6d5c49;font-size:10px;font-weight:700;}
  .fr-recommended-inline {display:flex;flex-wrap:wrap;gap:7px;color:#e7f5ff;font-weight:600;font-size:11px;}
  .fr-recommended-inline span {background:rgba(94,171,212,.18);padding:5px 8px;border-radius:6px;}
  .fr-profile-recommendation {color:#1b648b;font-weight:650;}
  .fr-tropopause-line {fill:none;stroke:#806c56;stroke-width:2.1;
    stroke-dasharray:6 5;stroke-linejoin:round;}
  .fr-tropopause-dot {fill:#725a42;stroke:#f5f2ed;stroke-width:1;}
  .fr-waypoint-target {cursor:pointer;}
  .fr-waypoint-target:focus {outline:none;}
  .fr-waypoint-leader {fill:none;stroke:#8f3f38;stroke-width:1;opacity:.65;}
  .fr-waypoint-nameplate {fill:#fff8f3;stroke:#bf655e;stroke-width:1;}
  .fr-waypoint-nameplate.fr-waypoint-nameplate-active {fill:#d1e8ff;stroke:#2478cf;stroke-width:1.5;}
  .fr-waypoint-code {font-size:10px;font-weight:800;fill:#7b2728;pointer-events:none;}
  .fr-route-bottom-label {font-size:10px;fill:#647485;}
  .fr-profile-flight-summary {display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;
    padding:11px 15px;color:#354658;font-size:12px;background:#e5edf3;border-top:1px solid #c2d2df;}
  .fr-profile-flight-summary span {white-space:nowrap;}
  .fr-profile-flight-summary b {font-weight:700;color:#234b75;margin-right:5px;}
  .fr-profile-tropopause-status {color:#75532f;font-weight:600;white-space:normal!important;}
  .fr-tropopause-tag rect {fill:#fffcf5;stroke:#846749;stroke-width:1;}
  .fr-tropopause-tag text {fill:#694a30;font-size:10px;font-weight:700;}
  .fr-tropopause-outside {font-size:10px;font-weight:700;fill:#6d4a2d;}
  .fr-profile-note {font-size:10px;color:#667789;padding:5px 12px 9px;background:#e9eef2;}
  .fr-profile-note p {margin:4px 0;}
  .fr-profile-note-details>summary {cursor:pointer;}
  @media(max-width:650px) {
    .fr-profile-panel {bottom:48px;max-height:72vh;}
    .fr-profile-head {padding:8px 10px;}
    .fr-profile-head strong {font-size:13px;}
    .fr-profile-head span {font-size:10px;}
    .fr-profile-scroll {max-height:51vh;}
  }
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
