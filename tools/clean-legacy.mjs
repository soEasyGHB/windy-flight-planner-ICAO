/** Remove only known deprecated files from v0.10.x installations; never touch navdata CSV. */
import {rmSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const known=[
  'src/offlineReport.ts','src/weather.ts','src/tropopause.ts','src/flightAltitude.ts',
  'src/profileChart.ts','src/windyDistanceLink.ts','src/plannerPointNames.ts','src/routePlanner.ts',
  'src/windyWeather.ts','api/windy-forecast.js','tests/test_windy_proxy_v010.mjs','vercel.json',
  'tests/test_clean_ui.mjs','tests/test_component_labels_v092.mjs','tests/test_component_labels_v093.mjs',
  'tests/test_flight_altitude.mjs','tests/test_flight_ui.mjs','tests/test_in_app_planner.mjs',
  'tests/test_new_v010.mjs','tests/test_offline_report.mjs','tests/test_open_meteo_v0102.mjs',
  'tests/test_planner_point_names.mjs','tests/test_profile_chart_v090.mjs',
  'tests/test_profile_feedback_v095.mjs','tests/test_profile_ui_v094.mjs',
  'tests/test_release_v085.mjs','tests/test_route_planner.mjs','tests/test_route_wind_v091.mjs',
  'tests/test_turbulence_default.mjs','tests/test_ui_layout.mjs',
  'tests/test_visual_route_v086.mjs','tests/test_weather.mjs',
  'src/nativePlannerHandoff.ts','tests/test_native_planner_handoff.mjs',
  'tests/test_gpx_export_v0104.mjs','tests/test_windy_distance_link_v0105.mjs'
];
const currentVersion=JSON.parse(readFileSync('package.json','utf8')).version;
let count=0;
for(const filename of known){
  try{rmSync(filename);count++;}catch(err){if(err.code!=='ENOENT')throw err;}
}
for(const filename of readdirSync('.')){
  if(/^(?:AUDIT|INSTALL)-v\d+\.\d+(?:\.\d+)?(?:-iPad)?\.md$/.test(filename)&&
    !filename.endsWith(`-v${currentVersion}.md`) &&
    !filename.endsWith(`-v${currentVersion.replace(/\.0$/,'')}.md`)){
    rmSync(join('.',filename));count++;
  }
  // Release archives do not belong in source control after extraction.
  if(/^Windy-Flight-Route-Analyzer-FULL-v[\d.]+\.(?:zip|sha256)$/.test(filename)){
    rmSync(join('.',filename));count++;
  }
}
console.log(`Cleaned ${count} legacy files; user navdata and project files preserved.`);
