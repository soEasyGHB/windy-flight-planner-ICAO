Windy Flight Route Analyzer v0.8.1 — missing plannerPointNames module fix

Extract this ZIP at the ROOT of your Codespaces repository.
Run:
  unzip -o Windy-Flight-Route-Analyzer-v0.8.1-PLANNER-HOTFIX.zip
  node tools/check-plugin-deps.mjs
  npm run build

This fix adds src/plannerPointNames.ts and a local import validator.
It does not change the plugin version or overwrite the UI.
