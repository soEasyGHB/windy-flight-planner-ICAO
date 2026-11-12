# Windy Flight Route Analyzer v0.9.3 — установка в Codespaces на iPad

Это **полная сборка исходников**, подготовленная на базе полного проекта v0.9.2. Отдельные HOTFIX не требуются.

## 1. Установка

В GitHub Codespaces открой корень репозитория, где находятся `package.json` и папка `src/`.
Если есть незакоммиченные правки, сохрани их до распаковки. Загрузи
`Windy-Flight-Route-Analyzer-FULL-v0.9.3.zip` через Explorer → Upload.

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.9.3.zip
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

**Критично:** не публикуй, если не прошли `npm run build` и
`npm run verify:release`. Проверка релиза должна вывести
`PASS: ready to publish version 0.9.3`.

## 2. Commit / push

```bash
git add .github/ src/ tests/ tools/ package.json README.md rollup.config.js svelte.config.js tsconfig.json .gitignore LICENSE public/index.html public/navdata/.gitkeep navdata-input/README.md INSTALL-v0.9.3-iPad.md AUDIT-v0.9.3.md
git commit -m "Release v0.9.3: hide zero wind components"
git push origin main
```

Если увидишь `nothing to commit`, проверь `git status` и текущую ветку `main`.

## 3. Публикация

GitHub → Actions → `publish-plugin` → `Run workflow` → `main`.
Обязательно проверь, что в журнале и `dist/plugin.json` стоит `0.9.3`.
Windy не принимает повторную публикацию уже существующей версии. Если `0.9.3`
уже опубликована, перед повторной публикацией потребуется новый номер версии
**сразу в** `package.json` **и** `src/pluginConfig.ts`.

## 4. Использование

В Windy открой плагин, построй маршрут, укажи ETD UTC.
Открой «Настройки» → «Прогноз и таблицы FL300–FL400» → «Получить профиль и открыть».
В графическом разрезе по FL330–390 зелёные стрелки **вправо** показывают
попутную компоненту ветра, красные **влево** — встречную, при чисто боковом ветре, штиле или отсутствии данных стрелки и цифры на графике **отсутствуют**. **Число под стрелкой — величина ненулевой составляющей вдоль маршрута, без знаков и единиц.**

Нажатие на номер FIX синхронизирует время карты Windy с ETA точки.
Верхняя строка показывает выбранную точку, общий ветер, курс и продольную
составляющую. При наведении на стрелку показываются полный ветер, боковая
составляющая и истинный курс участка.

Ветер рассчитывается относительно прямых между именованными FIX,
без геометрии ATS. **Это только обзор погоды; ETA рассчитано при постоянной
TAS 450 kt и не меняется от ветра.** Тропопауза — диагностическая оценка,
не официальный продукт SIGWX.

## 5. Что проверено локально

Строгий TypeScript, импорты, экспорты, все прежние сценарии и новые тесты
попутного/встречного/бокового ветра. В подготовительной среде отсутствует
Windy Rollup SDK, поэтому обязательная итоговая компиляция выполняется в
Codespaces.
