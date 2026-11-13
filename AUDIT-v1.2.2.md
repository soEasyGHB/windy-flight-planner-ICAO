# Аудит Windy Flight Route Analyzer 1.2.2

Версии `package.json` и `src/pluginConfig.ts`: **1.2.2**.

Изменения: две независимые кнопки (URL с округлением до ближайшего целого часа и точный `timestamp` API Windy с ожиданием `redrawFinished`), удалена кнопка «Скопировать URL». Прежние GPX и загрузка навигационных баз сохранены. Новые `src/nativePlannerHandoff.ts` и `tests/test_native_planner_handoff.mjs` проверяют передачу только достоверных непрерывных участков маршрута.

Ограничения: официальный URL Windy документирует трёхчасовые слоты; URL на произвольный час синтаксически корректен, но может не применить время в штатном планировщике. `@windy/store` официально управляет временем погодной карты, **а не ETD Route Planner**. Событие `rqstOpen('rplanner',...)` — внутренний эксперимент. Возможен отказ по сроку прогноза.

Проверки (после подготовки релиза): локальные TypeScript/импорты/тесты, имитация store/redraw/передачи координат, обработка отказа, GPX, чистая распаковка ZIP. Полный Rollup/Svelte билд необходимо подтвердить через `npm run test:release` в Codespaces при наличии npm-зависимостей. Реальный Windy/iPad в среде подготовки не тестировался.

Официальные источники API: `https://docs.windy-plugins.com/api/interfaces/DataSpecifications.DataSpecifications.html` (`timestamp`), `https://docs.windy-plugins.com/api/interfaces/broadcast.BasicBcastTypes.html` (`redrawFinished`, `rqstOpen`).
