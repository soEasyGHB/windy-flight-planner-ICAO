# AUDIT — Windy Flight Route Analyzer v0.10.5

## Задача

Передавать уже построенный маршрут в **штатный Windy Distance & Planning одним нажатием**, не скачивая и не загружая GPX.

## Реализация

- Новый `src/windyDistanceLink.ts` строит ссылку `https://www.windy.com/distance/lat,lon;lat,lon;...` из подтверждённой геометрии `buildWindyPlannerRequest`.
- В главной карточке «Планировщик полёта» — активная пользовательская ссылка `<a href target="_blank" rel="noopener noreferrer">` для десктопа и iPad. Ссылка создаётся после разбора маршрута и не зависит от загрузки API/навигационной базы.
- Полный маршрут передаётся полностью; при разрывах или неизвестных точках — только один самый длинный подтверждённый непрерывный участок с явным предупреждением.
- Новое состояние ссылки очищается при изменении поля или сбросе маршрута. Нет обращения к Vercel или платным API.
- Существующий экспорт GPX, iPad Share, экспериментальный внутривкладочный Windy `rplanner`, метеопрофиль Open-Meteo, тропопауза и ISA не изменены.
- В `package.json`, `src/pluginConfig.ts` повышена версия до 0.10.5, добавлены TS-исходник и тест. Обновлён список обязательных файлов.

## Источник

Windy staff: https://community.windy.com/topic/77/windy-com-url-parameters — `/distance/lat1,lon1;lat2,lon2;lat3,lon3` открывает Distance & Planning по геометрии.

## Ограничения

- Публично документированный URL передаёт координаты, но не ETD, TAS, FL и другие параметры коммерческого полётного планирования. Это визуальный маршрут, не утверждённый OFP.
- Внешняя вкладка может блокироваться конкретным браузером/режимом приложения; обязательно проверить на Windy/iPad после публикации.
- Без разрешения нераспознанных FIX и ATS нельзя получить полный путь. Нельзя автоматически делать фиктивные соединения.
- Компиляцию Rollup/Svelte следует подтвердить в Codespaces `npm run test:release` перед публикацией.

## Итоги локальных проверок (12.11.2026)

- `npm run typecheck:core` — PASS.
- `npm run check:imports` — PASS.
- `npm run check:exports` — PASS.
- `npm run check:tree` — PASS.
- `npm run check:build-config` — PASS.
- `npm test` — PASS, включая новый тест `tests/test_windy_distance_link_v0105.mjs` и `tools/check-plugin-startup.mjs`.
- `npm run build` — **не проверена компиляция**: завершается `rollup: not found` (зависимости npm не установлены). Нужно выполнить `npm install` и `npm run test:release` в Codespaces. Не считать настоящий Windy runtime или iPad проверенными.
