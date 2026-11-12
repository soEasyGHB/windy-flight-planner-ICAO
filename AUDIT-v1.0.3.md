# Аудит v1.0.3

- Заменён неработающий внутренний handoff третьей кнопки (`rqstOpen('rplanner', {...})`) на URL, реально проверенный пользователем: `/route-planner/ifr/lat,lon;...?YYYY-MM-DD-HH`.
- Создан `src/windyPlannerUrl.ts`. Контроль координат, непрерывности, предельной длины URL, валидации UTC и округления даты/времени до 3-часового интервала; маршруты с неизвестными точками не замыкаются через разрывы.
- Ссылка готовится при построении маршрута и обновляется при изменении ETD. Открывается штатным `href`, без `window.open` после асинхронных операций (особенно для iPad).
- Сохранены GPX Share Sheet/скачивание, имена точек в GPX, UTC-метаданные, две прежние кнопки и навигационные базы.
- Удалены старые `src/nativePlannerHandoff.ts` и `tests/test_native_planner_handoff.mjs`; тесты и проверки дерева проекта обновлены.
- `tests/test_windy_planner_url.mjs` покрывает точный подтверждённый URL 18:00 UTC, округление минут, переход даты, частичные маршруты и ошибки ввода.
- Полная компиляция Rollup/Svelte зависит от установленных npm-зависимостей; завершение проверки в Codespaces через `npm run test:release` обязательно.

## Фактическая проверка в текущей среде

Успешно выполнены `npm run check:tree`, `npm run check:build-config`, `npm run check:imports`, `npm run check:exports`, `npm run test:layout`, `npm run typecheck:core` и `npm test` (включая имитацию запуска Svelte-компонента).

**Полный билд не подтверждён:** `npm run build` завершается `sh: rollup: not found`. Установка зависимостей `npm install --no-audit --no-fund` завершается `EAI_AGAIN registry.npmjs.org`. Поэтому в Codespaces обязательны `npm install` и `npm run test:release` перед публикацией.

Проверка открытия в настоящем Windy на iPad не выполнялась в этом окружении. URL-формат уже подтверждён пользователем на отдельном тестовом маршруте.
