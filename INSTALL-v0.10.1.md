# Windy Flight Route Analyzer v0.10.1 — исправление компиляции и публикации

## Что исправлено относительно v0.10.0

1. `rollup.config.js`: в `@rollup/plugin-node-resolve` добавлены расширения `.ts`, `.tsx`, `.svelte` для импорта локальных модулей без расширения из `plugin.svelte`. Дефолтные расширения `@rollup/plugin-node-resolve` не включают `.ts`.
2. `package.json`: команда `npm run build` очищает и создаёт `dist`, запускает настоящую сборку Rollup и копирует `package.json` в `dist`, как делает официальный шаблон Windy.
3. `tools/verify-release.mjs`: отдельно проверяет, что `dist/package.json`, `dist/plugin.json`, `dist/plugin.js`, `dist/plugin.min.js` существуют и что версии совпадают.
4. Добавлены проверки `check:build-config` и `test:release`; в GitHub Actions публикация происходит только после тестов, настоящей сборки и проверки её результатов.
5. Сохранён весь функционал v0.10.0: основной и штатный планировщик, линии тропопаузы, ISA, спокойные стрелки ветра, рекомендации чётных/нечётных FL, прокси Windy Point Forecast, навигационная база и GPX.

## Важно: два разных ключа

- **GitHub → Settings → Secrets and variables → Actions → Repository secrets:** `WINDY_API_KEY` — ключ **для публикации плагина**, не Point Forecast.
- **Vercel → Project → Settings → Environment Variables:** `WINDY_POINT_FORECAST_KEY` — ключ **Point Forecast API**, нужен для таблиц Windy GFS. Перезапусти Deploy после добавления.
- В плагине Windy: **Настройки → Источник данных Windy Point Forecast** — корневой URL Vercel вида `https://your-project.vercel.app` без `/api`.

## GitHub Codespaces: готовые команды

Загрузи `Windy-Flight-Route-Analyzer-FULL-v0.10.1.zip` в **корень репозитория**, затем выполни в терминале:

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.10.1.zip
npm install --no-audit --no-fund
npm run test:release
```

**Не выполняй git commit/push при ошибках** — пришли полный вывод терминала (`npm run test:release`).

Если в конце выведено `PASS: ready to publish version 0.10.1`:

```bash
git add -A
git status --short
git commit -m "Fix Windy plugin build and release checks v0.10.1"
git push origin main
```

> Перед `git add -A` убедись, что в репозитории нет секретов или конфиденциальных данных. `node_modules/`, `dist/`, сырые навигационные файлы исключены в `.gitignore`.

Далее **GitHub → Actions → publish-plugin → Run workflow → main**. Публикация пройдёт только при успешной проверке реальной сборки. Если плагин публикуется из иной ветки, замени `main` на её имя во всех командах.

## Если Codespaces по-прежнему сообщает Compilation failed

Скопируй **первую ошибку**, начиная со строки `Error:` или `src/plugin.svelte (...)`, и 20 строк после неё. Без неё невозможно гарантированно установить дополнительные ошибки, зависящие от версии компилятора и установленных npm-зависимостей.

**Ограничения:** проверка с живым API Windy требует настоящего ключа. Значения прогнозные, не для оперативного планирования полётов; FL выбираются только по ветру. На домашней странице штатный Windy Route Planner остаётся ниже собственного блока.
