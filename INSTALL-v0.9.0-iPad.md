# Windy Flight Route Analyzer v0.9.0 — установка на iPad / GitHub Codespaces

Это **полный ZIP проекта**, а не HOTFIX. Он предназначен для распаковки непосредственно в **корень** существующего репозитория `soEasyGHB/windy-flight-planner-ICAO`.

## 1. Проверь расположение

В Codespaces открой корневую папку проекта, где лежат `package.json`, `src/` и `.github/`. Если у тебя есть незакоммиченные изменения, сначала сохрани их отдельно.

Загрузи архив `Windy-Flight-Route-Analyzer-FULL-v0.9.0.zip` в корень через Explorer → Upload.

## 2. Распакуй и проверь

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.9.0.zip
npm install
npm run check:tree
npm run check:imports
npm run check:exports
npm run typecheck:core
npm test
rm -rf dist
npm run build
npm run verify:release
```

Результат `npm run verify:release` должен содержать `PASS: ready to publish version 0.9.0`. Если любой шаг выдал ошибку — НЕ публикуй плагин; пришли последние строки ошибки.

## 3. Зафиксируй и отправь

```bash
git add .github/ src/ tests/ tools/ package.json README.md rollup.config.js svelte.config.js tsconfig.json .gitignore LICENSE public/index.html public/navdata/.gitkeep navdata-input/README.md INSTALL-v0.9.0-iPad.md AUDIT-v0.9.0.md
git commit -m "Full release v0.9.0: graphical weather route profile"
git push origin main
```

При `nothing to commit` проверь `git status` и сравни, что актуальная версия присутствует в `main`.

## 4. Опубликуй

На GitHub открой Actions → `publish-plugin` → Run workflow → branch `main`. Убедись, что перед отправкой в Windy выполнен `npm run build` и версия `dist/plugin.json` равна `0.9.0`.

**Если Windy сообщает `Plugin version 0.9.0 already exists`, повторная публикация с тем же номером невозможна.** Тогда нужно поднять версии в `package.json` и `src/pluginConfig.ts` до следующего свободного номера, например `0.9.1`, и пересобрать.

## 5. Где находится новый профиль

В Windy: открыть плагин → внизу «Настройки» → «Прогноз и таблицы FL300–FL400» → «Получить профиль и открыть».

Новая нижняя панель — **графический метеоразрез** по FL330, 340, 350, **360**, 370, 380, 390. Показывает флюгеры ветра, цветовую заливку ISA deviation, карту расстояний до именованных точек и, при наличии достаточно надёжных расчётных значений внутри выбранного диапазона, линию тропопаузы. Выбранную точку можно нажать, чтобы выставить её ETA на временной шкале Windy.

Подробные таблицы FL300–FL400 сохранены в «Настройках»; это отдельное представление. Прогноз — Open-Meteo, а не официальный авиационный SIGWX и не штатный прогноз Windy; фактическая геометрия ATS в v0.8.6 и v0.9.0 пропущена, расстояние и ETA приблизительные.

## Важная оговорка

Сборка Rollup проверяется **только после установки npm-зависимостей в Codespaces**. В локальном окружении подготовки архива npm registry был недоступен. Без успешных `npm run build` и `npm run verify:release` нельзя считать публикацию проверенной.
