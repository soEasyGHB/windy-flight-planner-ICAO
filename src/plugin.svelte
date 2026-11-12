<div class="plugin__mobile-header">{title}</div>
<section class="plugin__content flightplanner">
  <div class="plugin__title plugin__title--chevron-back" on:click={() => bcast.emit('rqstOpen', 'menu')}>{title}</div>

  <div class="fr-main-stack">
    <section class="fr-card" aria-labelledby="fr-section-route">
      <h3 id="fr-section-route">Ввод маршрута</h3>
      <label for="fr-route-input">Маршрут OFP / ICAO</label>
      <textarea id="fr-route-input" bind:value={routeText} on:input={routeInputChanged} rows="4" spellcheck="false" placeholder="EHAM DCT EDDF DCT LTFM DCT OMDB"></textarea>
      <div class="fr-buttons">
        <button type="button" class="primary" on:click={runRoute}>Построить маршрут</button>
        <button type="button" on:click={clearRoute}>Очистить</button>
      </div>
    </section>

    <section class="fr-card" aria-labelledby="fr-section-export">
      <h3 id="fr-section-export">Планировщик полёта</h3>
      <div class="fr-etd-stack" role="group" aria-label="Дата и время вылета UTC">
        <div>
          <label for="fr-etd-date">Дата вылета (UTC)</label>
          <input id="fr-etd-date" type="date" bind:value={etdDate} on:change={departureInputChanged} />
        </div>
        <div>
          <label for="fr-etd-time">Время вылета (UTC)</label>
          <input id="fr-etd-time" type="time" step="60" bind:value={etdTime} on:change={departureInputChanged} />
        </div>
      </div>
      <div class="fr-export-actions">
        <button type="button" class="primary" disabled={!gpxXml} on:click={sharePlannerGpx}>Скачать GPX</button>
        <button type="button" on:click={openNativePlanner}>Открыть штатный планировщик Windy</button>
        {#if windyPlannerUrl}
          <a class="fr-force-handoff" href={windyPlannerUrl} target="_blank" rel="noopener noreferrer" on:click={noteWindyPlannerOpen}>Открыть маршрут с UTC в Windy</a>
        {:else}
          <button type="button" class="fr-force-handoff" disabled>Открыть маршрут с UTC в Windy</button>
        {/if}
      </div>
    </section>
  </div>

  <details class="fr-settings">
    <summary>Настройки</summary>
    <div class="fr-settings-inner">
      <details class="fr-settings-group">
        <summary>Ошибки и предупреждения</summary>
        <div class="fr-settings-body">
          <label class="fr-toggle" for="fr-show-warnings">
            <input id="fr-show-warnings" type="checkbox" bind:checked={showDiagnostics} on:change={savePreferences}/>
            Показывать подробные ошибки и предупреждения
          </label>
          {#if showDiagnostics}
            <p class:fr-warning={gpxIsPartial} class="fr-feedback" role="status" aria-live="polite">{gpxFeedback}</p>
            <p class="fr-info" role="status" aria-live="polite">{status}</p>
            {#if windyPlannerNote}
              <p class:fr-warning={windyPlannerPartial} class="fr-small">{windyPlannerNote}</p>
            {/if}
            {#if parsed}
              <p class="fr-small">Точек: {parsed.points.length}; подтверждённая длина: {Math.round(parsed.distanceNm)} NM; подписей: {labeledCount}.</p>
              {#each routeIssues(parsed) as issue}
                <p class="fr-warning" role="alert">{issue}</p>
              {/each}
              {#if parsed.ambiguous.length}
                <p class="fr-warning">Неоднозначные FIX требуют проверки координат перед использованием GPX.</p>
              {/if}
              <details class="fr-coordinates">
                <summary>Координаты распознанных точек ({parsed.points.length})</summary>
                <div class="fr-scrolltable"><table><thead><tr><th>FIX</th><th>Широта</th><th>Долгота</th><th>Источник</th></tr></thead><tbody>
                  {#each parsed.points as point}
                    <tr><td>{point.ident}</td><td>{point.lat.toFixed(4)}</td><td>{point.lon.toFixed(4)}</td><td>{point.source}</td></tr>
                  {/each}
                </tbody></table></div>
              </details>
            {/if}
            <p class="fr-small">Маршрут и GPX — схематичное представление для визуализации. Не использовать как официальный навигационный документ. Неподтверждённые участки не соединяются.</p>
          {/if}
        </div>
      </details>

      <details class="fr-settings-group">
        <summary>Навигационные базы данных</summary>
        <div class="fr-settings-body">
          <p class="fr-small">Источник: <a href={repoUrl} target="_blank" rel="noopener noreferrer">публичный GitHub-репозиторий</a>. Файлы <code>earth_fix.dat</code>, <code>earth_nav.dat</code>, <code>earth_awy.dat</code> одного AIRAC можно обновлять через синхронизацию Google Drive.</p>
          <div class="fr-buttons fr-db-actions">
            <button type="button" on:click={openSyncWorkflow}>Синхронизация Google Drive</button>
            <button type="button" on:click={openGitHubUpload}>Загрузить базу через GitHub</button>
            <button type="button" class="primary" disabled={busy} on:click={updateHosted}>{busy?'Проверка базы…':'Проверить новую базу'}</button>
          </div>
          {#if githubCycle}
            <p class="fr-info">AIRAC {githubCycle}; обновлено {githubGenerated || 'неизвестно'}; точек {githubPoints.toLocaleString('ru-RU')}; вершин трасс {githubVertices.toLocaleString('ru-RU')}.</p>
          {:else if showDiagnostics}
            <p class="fr-warning">Опубликованная база GitHub пока не загружена. Доступны только встроенные и дополнительные открытые источники.</p>
          {/if}
          <p class="fr-small">Загружено точек: {pointTotal.toLocaleString('ru-RU')}; трасс: {airways}; дополнительных источников: {loadedSources}/3. Навигационная база предназначена для визуализации, не для IFR-навигации.</p>
          <p class="fr-small">Для автоматического обновления GitHub Actions нужна переменная <code>GDRIVE_NAVDATA_FOLDER_URL</code> с публичной ссылкой на папку. Используй только данные, разрешённые к распространению.</p>
        </div>
      </details>
    </div>
  </details>
</section>

<script lang="ts">
  import bcast from '@windy/broadcast';
  import {store} from '@windy/store';
  import {map} from '@windy/map';
  import {onMount,onDestroy} from 'svelte';
  import config from './pluginConfig';
  import {loadDemo,loadOpenSources,airwayCount,parseNamedFixRoute,mapLabelPoints,totalPoints,sourceCount,loadGithubSnapshot,githubUploadUrl} from './navdb';
  import {NAVDATA_GITHUB_REPO} from './navdataConfig';
  import {routeIssues,departureIsoUtc} from './routeGpx';
  import {buildWindyPlannerUrl} from './windyPlannerUrl';
  import {prepareGpxPayload,createGpxHref,makeGpxShareFile,triggerGpxDownload} from './gpxDownload';
  import type {ParsedRoute} from './navdb';

  const {title}=config;
  const repoUrl=NAVDATA_GITHUB_REPO;
  const SAVED_ROUTE_KEY='windy-flight-route-analyzer:route:v2';
  const SETTINGS_KEY='windy-flight-route-analyzer:settings:v2';
  const DEPARTURE_KEY='windy-flight-route-analyzer:departure:v1';
  const initialETD=new Date(Date.now()+2*3600000).toISOString().slice(0,16);
  let routeText='EHAM DCT EDDF DCT LTFM DCT OMDB';
  let etdDate=initialETD.slice(0,10);
  let etdTime=initialETD.slice(11,16);
  let showDiagnostics=true;
  let status='Навигационная база загружается.';
  let parsed:ParsedRoute|null=null;
  let lines:L.Polyline[]=[];
  let markers:Array<L.CircleMarker|L.Marker>=[];
  let labeledCount=0;
  let busy=false;
  let githubCycle='';
  let githubGenerated='';
  let githubPoints=0;
  let githubVertices=0;
  let pointTotal=0;
  let loadedSources=0;
  let airways=0;

  let gpxDownloadHref='';
  let gpxFileName='windy-route.gpx';
  let gpxXml='';
  let gpxIsPartial=false;
  let gpxFeedback='Построй маршрут, чтобы подготовить GPX.';
  let windyPlannerUrl='';
  let windyPlannerNote='';
  let windyPlannerPartial=false;

  function saveRoute():void {
    try {localStorage.setItem(SAVED_ROUTE_KEY,routeText);} catch (_err) { /* private mode */ }
  }
  function saveDeparture():void {
    try {
      departureIsoUtc(etdDate,etdTime);
      localStorage.setItem(DEPARTURE_KEY,JSON.stringify({etdDate,etdTime}));
    } catch (_err) { /* invalid entry or private mode: do not save */ }
  }
  function departureInputChanged():void {
    saveDeparture();
    prepareGpxDownload();
  }
  function savePreferences():void {
    try {localStorage.setItem(SETTINGS_KEY,JSON.stringify({showDiagnostics}));} catch (_err) { /* private mode */ }
  }
  function restoreSettings():void {
    try {
      const route=localStorage.getItem(SAVED_ROUTE_KEY);
      if(typeof route==='string' && route.length<=50000)routeText=route;
      else {
        // One-time compatibility with v0.10.x: retain the previously entered route.
        const legacy=localStorage.getItem('windy-flight-route-analyzer:flight:v1');
        if(legacy){
          const data=JSON.parse(legacy) as {routeText?:unknown};
          if(typeof data.routeText==='string'&&data.routeText.length<=50000)routeText=data.routeText;
        }
      }
      let departure=localStorage.getItem(DEPARTURE_KEY);
      // One-time migration from the previous flight planner, retaining ETD only.
      if(!departure)departure=localStorage.getItem('windy-flight-route-analyzer:flight:v1');
      if(departure){
        const value=JSON.parse(departure) as {etdDate?:unknown;etdTime?:unknown};
        if(typeof value.etdDate==='string'&&typeof value.etdTime==='string'){
          try {
            departureIsoUtc(value.etdDate,value.etdTime);
            etdDate=value.etdDate;etdTime=value.etdTime;
          } catch (_err) { /* Keep a valid default for invalid saved ETD */ }
        }
      }
      const prefs=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}') as {showDiagnostics?:unknown};
      if(typeof prefs.showDiagnostics==='boolean')showDiagnostics=prefs.showDiagnostics;
    } catch (_err) { /* invalid or unavailable local storage */ }
  }
  function clearGpxDownload():void {
    if(gpxDownloadHref.startsWith('blob:')) {
      try {URL.revokeObjectURL(gpxDownloadHref);} catch (_err) { /* unsupported WebView */ }
    }
    gpxDownloadHref='';gpxXml='';gpxIsPartial=false;windyPlannerUrl='';windyPlannerNote='';windyPlannerPartial=false;
  }
  function prepareGpxDownload():void {
    clearGpxDownload();
    if(!parsed){gpxFeedback='Сначала построй маршрут.';return;}
    try {
      const departureUtc=departureIsoUtc(etdDate,etdTime);
      // Prepare the real URL handoff independently from the GPX file. An <a>
      // preserves the actual user click, which is important on iPad Safari.
      try {
        const link=buildWindyPlannerUrl(parsed,departureUtc);
        windyPlannerUrl=link.url;
        windyPlannerPartial=link.partial;
        windyPlannerNote=`Ссылка Windy: ${link.from} → ${link.to}, ${link.pointsSent} точек; время URL ${link.urlTimeUtc.replace(/-(\d{2})$/,' $1:00')} UTC.`+
          (link.roundedTime?' Выбранные минуты округлены до ближайшего 3-часового интервала; точный ETD сохраняется в GPX.':'')+
          (link.partial?' Маршрут неполный: передан только самый длинный подтверждённый непрерывный участок.':'');
      } catch(linkError) {
        windyPlannerNote='Ссылка Windy недоступна: '+String(linkError);
      }
      const item=prepareGpxPayload(parsed,{departureUtc,routeText});
      gpxXml=item.xml;
      gpxFileName=item.filename;
      gpxIsPartial=item.partial;
      gpxDownloadHref=createGpxHref(item);
      gpxFeedback=item.partial
        ? `Частичный GPX ${item.filename} готов: ${item.pointCount} точек, ${item.routeCount} отдельных участка(ов). ETD ${etdDate} ${etdTime} UTC записано в файл. Проверь разрывы и неоднозначные FIX.`
        : `GPX ${item.filename} готов: ${item.pointCount} точек. ETD ${etdDate} ${etdTime} UTC записано в файл. Нажми «Скачать GPX».`;
    } catch(err) {
      gpxFeedback='GPX недоступен: '+String(err);
      status=gpxFeedback;
    }
  }
  function clearMap():void {
    for(const layer of [...lines,...markers]) {
      try {map.removeLayer(layer);} catch(err) {console.warn('Ошибка удаления линии маршрута',err);}
    }
    lines=[];markers=[];
  }
  function routeInputChanged():void {
    parsed=null;
    clearGpxDownload();
    clearMap();
    gpxFeedback='Маршрут изменён. Нажми «Построить маршрут».';
    status='Маршрут изменён; предыдущий GPX сброшен.';
    saveRoute();
  }
  function clearRoute():void {
    routeText='';parsed=null;labeledCount=0;
    clearGpxDownload();clearMap();
    gpxFeedback='Сначала введи маршрут.';
    status='Маршрут очищен.';
    saveRoute();
  }
  function safeLabel(s:string):string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function runRoute():void {
    saveRoute();clearMap();labeledCount=0;
    clearGpxDownload();
    try {parsed=parseNamedFixRoute(routeText);} catch(err) {
      parsed=null;status='Ошибка разбора маршрута: '+String(err);gpxFeedback='Не удалось подготовить GPX.';return;
    }
    // GPX is prepared independently of Windy map rendering and network access.
    prepareGpxDownload();
    const safeSegments=parsed.segments.filter(segment=>segment.length>=2);
    const namedFixes=mapLabelPoints(parsed);
    if(!safeSegments.length && !namedFixes.length){status='Нет распознанных точек. Проверь базу и маршрут.';return;}
    const coords:[number,number][]=[];
    for(const segment of safeSegments){
      const points=segment.map(p=>[p.lat,p.lon] as [number,number]);
      coords.push(...points);
      try {lines.push(new L.Polyline(points,{color:'#ff853b',weight:4,opacity:.9}).addTo(map));}
      catch(err){console.warn('Не удалось нарисовать участок',err);}
    }
    for(const point of namedFixes){
      let drawn=false;
      let marker:L.CircleMarker|undefined;
      try {
        marker=new L.CircleMarker([point.lat,point.lon],{
          radius:3.5,color:'#fff',weight:1.4,fillColor:'#ff853b',fillOpacity:1,interactive:false
        });
        if(typeof marker.bindTooltip!=='function')throw Error('Tooltip недоступен');
        const label=document.createElement('span');label.textContent=point.ident;
        marker.bindTooltip(label,{permanent:true,direction:'right',offset:[7,0],className:'fr-route-fix-tooltip',opacity:1,interactive:false});
        markers.push(marker.addTo(map));drawn=true;
      } catch(err) {
        if(marker)try {map.removeLayer(marker);}catch(_e){}
        try {
          const icon=new L.DivIcon({html:`<span class="fr-waypoint">${safeLabel(point.ident)}</span>`,className:'fr-label-icon',iconSize:[90,22],iconAnchor:[5,11]});
          markers.push(new L.Marker([point.lat,point.lon],{icon,interactive:false,zIndexOffset:10000}).addTo(map));
          drawn=true;
        } catch(fallbackErr) {console.warn('Не удалось подписать FIX',point.ident,fallbackErr);}
      }
      if(drawn)labeledCount++;
    }
    if(!coords.length)coords.push(...namedFixes.map(p=>[p.lat,p.lon] as [number,number]));
    if(coords.length){
      try {map.fitBounds(coords,{padding:[35,35],maxZoom:8});}
      catch(_err) {try {map.setView(coords[0],5);}catch(_e) {}}
    }
    const issues=routeIssues(parsed);
    status=`Маршрут: ${parsed.points.length} точек, ${Math.round(parsed.distanceNm)} NM по подтверждённым отрезкам. ${issues.length?`Предупреждений: ${issues.length}.`:'Разрывов не обнаружено.'}`;
  }
  function openNativePlanner():void {
    // Sync the Windy forecast timeline to selected UTC ETD. This is the documented
    // public store; it does not pass our route or configure the planner itself.
    // Windy can reject out-of-range timestamps, and its native planner may ignore
    // the map timestamp. We report those limitations rather than claiming success.
    let timeMessage='';
    try {
      const target=Date.parse(departureIsoUtc(etdDate,etdTime));
      store.set('timestamp',target);
      const actual=Number(store.get('timestamp'));
      timeMessage=Number.isFinite(actual) && Math.abs(actual-target)<=30*60*1000
        ? `Время прогноза Windy синхронизировано с ${etdDate} ${etdTime} UTC${actual===target?'':' (с округлением модели)'}. Время старта в планировщике проверь отдельно.`
        : `Windy не принял ${etdDate} ${etdTime} UTC (возможно, за пределами прогноза). Время в планировщике установи вручную.`;
    } catch(err) {
      timeMessage='Не удалось синхронизировать UTC с Windy: '+String(err)+'. Время начала проверь вручную.';
    }
    try {
      // Open native planner with no route, TAS, FL or other flight parameters.
      bcast.emit('rqstOpen','rplanner');
      status=timeMessage;
    } catch(err) {
      status='Не удалось открыть встроенный планировщик: '+String(err)+'. '+timeMessage;
      try {window.open('https://www.windy.com/distance','_blank','noopener,noreferrer');}
      catch(openErr){status+=' Не удалось открыть резервную ссылку: '+String(openErr);}
    }
  }
  function noteWindyPlannerOpen():void {
    // The native IFR planner is opened by the actual href (no undocumented
    // bcast payload, GPX-upload API or delayed window.open()).
    status=windyPlannerNote || 'Открываю штатный IFR-планировщик Windy по URL.';
  }
  function downloadGpxFallback():void {
    if(!gpxDownloadHref){gpxFeedback='GPX пока не готов. Сначала построй маршрут.';return;}
    try {
      triggerGpxDownload(gpxDownloadHref,gpxFileName);
      gpxFeedback=(gpxIsPartial?'Запрошено сохранение частичного GPX. ':'Запрошено сохранение GPX. ')+
        'Если браузер не сохранил файл, попробуй Safari или меню «Поделиться» на iPad.';
    }catch(err){gpxFeedback='Не удалось скачать GPX: '+String(err);}
  }
  async function sharePlannerGpx():Promise<void> {
    if(!gpxXml){gpxFeedback='GPX не готов. Сначала построй маршрут.';return;}
    // Primary path on iPad: the native Share Sheet, including "Save to Files".
    // Keep a normal browser download fallback without adding a third button.
    let file:File|null=null;
    try {file=makeGpxShareFile({xml:gpxXml,filename:gpxFileName,partial:gpxIsPartial,pointCount:0,routeCount:0});}
    catch(_err){/* Browser cannot construct a File; use regular download. */}
    if(!file || typeof navigator.share!=='function') {downloadGpxFallback();return;}
    if(typeof navigator.canShare==='function') {
      try {if(!navigator.canShare({files:[file]})){downloadGpxFallback();return;}}
      catch(_err){downloadGpxFallback();return;}
    }
    try {
      // Call directly in the click handler, before any await, to preserve user activation.
      const sharing=navigator.share({files:[file]});
      gpxFeedback='В меню iPad выбери «Сохранить в Файлы» или нужное приложение.';
      await sharing;
      gpxFeedback='GPX передан в выбранное приложение.';
    }catch(err){
      if(err instanceof Error && err.name==='AbortError'){gpxFeedback='Сохранение GPX отменено.';return;}
      gpxFeedback='Не удалось поделиться GPX: '+String(err)+'. Попробуй снова или открой Safari.';
    }
  }
  async function updateHosted():Promise<void> {
    if(busy)return;
    busy=true;
    try {
      status='Загружаю навигационную базу GitHub…';
      const result=await loadGithubSnapshot(repoUrl);
      githubCycle=result.cycle;
      githubGenerated=result.generated;
      githubPoints=result.points;
      githubVertices=result.airwayVertices;
      pointTotal=totalPoints();airways=airwayCount();
      runRoute();
      status=`GitHub: AIRAC ${result.cycle}; ${result.points} точек, ${result.airwayVertices} вершин трасс. Маршрут обновлён.`;
    } catch(err) {
      status='Не удалось обновить GitHub-базу: '+String(err)+'. Проверь manifest, CSV и публичный доступ.';
    } finally {busy=false;}
  }
  function openSyncWorkflow():void {
    window.open(repoUrl+'/actions/workflows/sync-gdrive-navdata.yml','_blank','noopener,noreferrer');
    status='В GitHub запусти Actions → sync-gdrive-navdata → Run workflow.';
  }
  function openGitHubUpload():void {
    window.open(githubUploadUrl(repoUrl),'_blank','noopener,noreferrer');
    status='Загрузи ZIP в navdata-input → Commit changes, затем запусти build-navdata.';
  }
  async function reloadSources():Promise<void> {
    try {
      await loadOpenSources(msg=>{status=msg;pointTotal=totalPoints();loadedSources=sourceCount();});
      pointTotal=totalPoints();loadedSources=sourceCount();
      if(routeText)runRoute();
    }catch(err){status='Не удалось загрузить дополнительные источники: '+String(err);}
  }
  export const onopen=()=>{
    if(parsed?.points.length)try {runRoute();}catch(err){console.warn('Route redraw failed',err);status='Ошибка карты: '+String(err);}
  };
  onMount(()=>{
    restoreSettings();
    try {loadDemo();pointTotal=totalPoints();runRoute();}
    catch(err){console.error('Initial route error',err);status='Ошибка запуска: '+String(err);}
    void (async()=>{await updateHosted();await reloadSources();})();
  });
  onDestroy(()=>{saveRoute();saveDeparture();savePreferences();clearGpxDownload();clearMap();});
</script>

<style lang="less">
  .flightplanner {font-size:13px;color:#17212b;}
  .flightplanner .fr-main-stack {display:flex;flex-direction:column;gap:12px;margin:10px 0 14px;}
  .flightplanner .fr-card {border:1px solid #87909a;border-radius:16px;background:#56616d;padding:16px;min-width:0;}
  .flightplanner .fr-card h3 {font-size:15px;margin:0 0 12px;color:#fff;text-align:center;}
  .flightplanner .fr-card label {color:#f7f9fa;display:block;margin-bottom:7px;}
  .flightplanner .fr-card textarea {background:#788491;color:#fff;border:1px solid #b0b9c1;border-radius:7px;resize:vertical;width:100%;box-sizing:border-box;font-size:14px;padding:9px;min-height:86px;}
  .flightplanner .fr-card textarea::placeholder {color:#e1e5e8;}
  .flightplanner button {border-radius:8px;min-height:44px;padding:9px 12px;box-sizing:border-box;font:inherit;cursor:pointer;}
  .flightplanner button:disabled {opacity:.55;cursor:not-allowed;}
  .flightplanner .primary {background:#d8ecff;color:#173f5d;border:1px solid #8ea9bd;font-weight:700;}
  .flightplanner .fr-etd-stack {display:flex;flex-direction:column;align-items:center;gap:11px;max-width:220px;margin:0 auto 15px;}
  .flightplanner .fr-etd-stack > div {width:100%;min-width:0;text-align:center;}
  .flightplanner .fr-etd-stack label {display:block;text-align:center;}
  .flightplanner #fr-etd-date,.flightplanner #fr-etd-time {display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;height:42px;padding:8px 10px;background:#788491;color:#fff;border:1px solid #b0b9c1;border-radius:7px;font:inherit;font-size:14px;color-scheme:dark;}
  .flightplanner .fr-buttons,.flightplanner .fr-export-actions {display:flex;gap:8px;flex-wrap:wrap;margin-top:11px;}
  .flightplanner .fr-buttons > button,.flightplanner .fr-export-actions > button,.flightplanner .fr-export-actions > a {flex:1 1 160px;text-align:center;}
  .flightplanner .fr-force-handoff {display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-radius:8px;min-height:44px;padding:9px 12px;background:#27648c;color:#fff;border:1px solid #1c567c;font:inherit;font-weight:700;text-decoration:none;cursor:pointer;}
  .flightplanner .fr-feedback {font-size:12px;color:#e7f0f8;margin:11px 0 0;line-height:1.5;}
  .flightplanner .fr-feedback.fr-warning {color:#ffe0ae;}
  .flightplanner .fr-settings {border:1px solid #b7c0c7;border-radius:12px;margin:12px 0;overflow:hidden;background:#f7f9fb;}
  .flightplanner .fr-settings > summary {padding:14px;font-weight:700;cursor:pointer;}
  .flightplanner .fr-settings-inner {padding:0 12px 12px;}
  .flightplanner .fr-settings-group {border-top:1px solid #d5dce3;padding:12px 0;}
  .flightplanner .fr-settings-group > summary {font-weight:700;cursor:pointer;}
  .flightplanner .fr-settings-body {padding-top:12px;line-height:1.5;}
  .flightplanner .fr-settings-body a {word-break:break-word;}
  .flightplanner .fr-settings-body .fr-small {font-size:12px;color:#515e69;}
  .flightplanner .fr-settings-body .fr-warning {font-size:12px;color:#793911;background:#fff4e6;border-left:3px solid #d98325;padding:8px;}
  .flightplanner .fr-info {font-size:12px;white-space:pre-wrap;}
  .flightplanner .fr-toggle {display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer;}
  .flightplanner .fr-toggle input {width:18px;height:18px;flex:none;}
  .flightplanner .fr-db-actions button {flex:1 1 175px;}
  .flightplanner .fr-scrolltable {max-width:100%;overflow-x:auto;margin-top:8px;}
  .flightplanner table {font-size:12px;border-collapse:collapse;min-width:400px;}
  .flightplanner th,.flightplanner td {padding:5px 8px;text-align:left;border-bottom:1px solid #ced6dd;}
  :global(.fr-route-fix-tooltip) {background:rgba(255,255,255,.95)!important;color:#24333e!important;border:1px solid #64717a!important;font-weight:700!important;box-shadow:none!important;}
  :global(.fr-waypoint) {font-size:12px;font-weight:700;color:#fff;background:#303f4d;border-radius:5px;padding:2px 5px;white-space:nowrap;}
  @media(max-width:600px){.flightplanner .fr-card {padding:12px;}.flightplanner .fr-settings-inner {padding:0 10px 10px;}}
</style>
