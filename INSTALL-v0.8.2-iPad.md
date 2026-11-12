# Установка полной версии v0.8.2 в GitHub Codespaces (iPad)

**Важно:** это ПОЛНЫЙ ZIP, не маленький HOTFIX. В нём находятся все исходники, workflow и тесты. Подменять ваши действующие CSV навигационной базы не нужно: архив их не содержит.

## 1. Перед началом

Проверьте в терминале, что вы на ветке `main` и рабочая директория чистая. При необходимости сохраните свои несохранённые изменения в отдельный коммит.

```bash
git status
git branch --show-current
git pull --ff-only origin main
```

Загрузите архив `Windy-Flight-Route-Analyzer-FULL-v0.8.2.zip` в корень репозитория через Codespaces Explorer → Upload.

## 2. Распакуйте в КОРЕНЬ репозитория

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.8.2.zip
ls src
```

Должны присутствовать `plugin.svelte`, `routePlanner.ts`, `plannerPointNames.ts`, `flightAltitude.ts`, `weather.ts`, `navdb.ts`, `navdataConfig.ts`, `offlineReport.ts`, `xplane.ts`, `pluginConfig.ts`.

## 3. Обязательные проверки

```bash
npm install
npm run check:imports
npm run check:exports
npm run typecheck:core
npm test
npm run build
npm run verify:release
```

Любая красная ошибка — **остановите публикацию** и отправьте полный текст ошибки. `verify:release` должен вывести `PASS: ready to publish version 0.8.2`.

## 4. Отправьте ПОЛНЫЙ проект в GitHub

```bash
git add .github src tools tests package.json README.md INSTALL-v0.8.2-iPad.md rollup.config.js svelte.config.js tsconfig.json .gitignore LICENSE public/index.html navdata-input/README.md public/navdata/.gitkeep

git commit -m "Full coherent release v0.8.2"
git push origin main
```

Если git пишет, что изменений нет, проверьте `git status` и `git log -1 --oneline`.

## 5. Публикация

GitHub → Actions → `publish-plugin` → Run workflow → Branch `main` → Run. В workflow добавлены проверка экспортов и сверка готового манифеста с `package.json`. Для Windy требуется секрет `WINDY_API_KEY`.

Версию `0.8.2` нельзя публиковать повторно, если Windy уже принял её раньше. В этом случае увеличьте версию одновременно в `package.json` и `src/pluginConfig.ts` и повторите сборку.

## 6. Быстрая проверка в Windy

1. Главный экран: четыре блока в нужном порядке; спойлер «Настройки» закрыт.
2. Построить `EHAM DCT EDDF DCT LTFM`; точки должны иметь имена.
3. Выбрать FL350 + турбулентность. Проверить диапазон, либо текст ошибки в «Настройках» (текущий слой может ограничивать диапазон).
4. Проверить ETD/TAS, список ETA по именованным точкам.
5. Проверить GPX и автономный HTML (для реального погодного слоя нужно добавить собственный снимок карты).
6. Для настоящего маршрута OFP проверить актуальную AIRAC-базу и отсутствие разрывов в диагностике.
