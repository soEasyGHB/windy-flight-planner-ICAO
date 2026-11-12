# Windy Flight Route Analyzer v0.8.5 — установка полного проекта на iPad

Это **полный исходный проект** с четырьмя блоками интерфейса, без вложенной папки внутри архива.

## 1. В GitHub Codespaces

Сначала убедись, что находишься в корне нужного репозитория. Если у тебя есть несохранённые изменения — сохрани/закоммить их отдельно.

```bash
pwd
git status --short
git branch --show-current
```

Загрузи архив `Windy-Flight-Route-Analyzer-FULL-v0.8.5.zip` в корень репозитория через Explorer → Upload и распакуй:

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.8.5.zip
```

**Важно:** ZIP содержит исходники и workflow на верхнем уровне, а не папку `Windy-Flight-Route-Analyzer-v0.8.5/`. Действующие файлы AIRAC в `public/navdata/` не заменяются.

## 2. Проверить до публикации

```bash
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

Все команды должны завершиться без ошибок. Последняя должна вывести `PASS: ready to publish version 0.8.5`.

Если `npm run build` не проходит, не запускай GitHub Actions и пришли текст ошибки.

## 3. Отправить в GitHub

```bash
git add .github/workflows/ src/ tools/ tests/ package.json README.md rollup.config.js svelte.config.js tsconfig.json .gitignore LICENSE public/index.html public/navdata/.gitkeep navdata-input/README.md INSTALL-v0.8.5-iPad.md

git commit -m "Full verified source release v0.8.5"
git push origin main
```

Если Git сообщает `nothing to commit`, сначала проверь, что изменения находятся в нужной ветке.

## 4. Опубликовать

GitHub → Actions → `publish-plugin` → Run workflow → ветка `main`.

Перед отправкой Windy сам workflow повторяет тесты, компиляцию и проверку `dist/plugin.json`.

**Примечание:** на машине сборки, где подготовлен ZIP, npm-реестр был недоступен (`EAI_AGAIN`). Поэтому реальный Rollup/Windy-билд не мог быть проверен. Проверка на Codespaces обязательна.

Геометрия маршрута и погодные данные — только для предварительного обзора, не для оперативной навигации/официального брифинга.
