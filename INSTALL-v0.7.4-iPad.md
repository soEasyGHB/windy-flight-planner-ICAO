# Обновление v0.7.3 → v0.7.4 с iPad

Галочка подтверждения неоднозначных точек удалена. GPX и Windy Route Planner используют уже выбранные программой координаты без дополнительного нажатия. Предупреждения остаются; разрывы не соединяются. Без доступного отрезка минимум из двух точек экспорт невозможен.

Архив содержит только изменённые файлы. Навигационная база Google Drive/GitHub, настройки репозитория и Actions не перезаписываются.

1. Загрузи Windy-Flight-Route-Analyzer-UPDATE-v0.7.4.zip в корень своего проекта в Codespaces.
2. Выполни `git status`. Если есть незавершённый merge/rebase или свои несохранённые изменения, сначала разберись с ними, чтобы не затереть работу.
3. При чистом рабочем дереве выполни по порядку, останавливаясь при ошибке:

```bash
git pull --ff-only origin main
unzip -o Windy-Flight-Route-Analyzer-UPDATE-v0.7.4.zip
npm run typecheck:core
npm test
npm run build
```

Если зависимости ещё не установлены, перед проверками выполни `npm install`.

4. После успешных проверок:

```bash
git add src/plugin.svelte src/pluginConfig.ts package.json README.md INSTALL-v0.7.4-iPad.md
git commit -m "Remove ambiguous FIX confirmation checkbox v0.7.4"
git push origin main
```

5. GitHub → Actions → publish-plugin → Run workflow. После успешной публикации перезагрузи страницу Windy и открой плагин.

## Проверка подготовленного обновления

Успешно выполнены `npm run typecheck:core`, `npm test` и `npm run build` (Svelte/Windy). Сборка выдаёт существующие предупреждения доступности интерфейса и Rollup cleanup, без ошибок. Дополнительно проверены фактические обработчики кнопок с имитацией браузера: полный и разорванный маршруты с неоднозначными FIX открывают ссылку и создают GPX без подтверждения; разорванный GPX сохраняет два отдельных сегмента.

Работа в реальном Windy на iPad проверяется после публикации; здесь она не проверялась.
