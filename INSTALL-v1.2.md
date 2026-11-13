# Windy Flight Route Analyzer 1.2 — чистое обновление репозитория

**Windy / package.json: 1.2.0.** Это новый номер версии для публикации без конфликта с опубликованными релизами.

## Что входит в ZIP

Полный исходный проект v1.2.0, нужные тесты, средства конвертации навигационной базы и три текущих GitHub Actions workflow. ZIP не содержит `node_modules`, `tests/generated`, `dist`, старых `AUDIT-*`/`INSTALL-*`, офлайн-отчётов или файлов старого погодного API. Это исходники, а не предварительно скомпилированный результат.

## GitHub Codespaces: обновление с очисткой

Сначала открой Codespaces существующего репозитория и убедись, что нет незакоммиченных важных личных изменений (проверь `git status`). Получи свежую ветку:

```bash
git switch main
git fetch origin
git pull --ff-only origin main
```

Загрузи `Windy-Flight-Route-Analyzer-FULL-v1.2.zip` **в корень** репозитория через проводник Codespaces, а затем выполни:

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v1.2.zip
node tools/clean-legacy.mjs --dry-run
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

`--dry-run` показывает, что будет удалено. Если среди путей обнаружатся твои собственные нужные файлы, не запускай очистку, пока не сохранишь их. Очистка ограничена папками исходников/тестов/workflow и известными старыми инструкциями/архивами. Она **не удаляет** `navdata-input/`, `public/navdata/`, `.git/`, настройки секрета GitHub и данные, размещённые вне кодовых директорий.

**Если `npm run test:release` не завершилась успешно, не публикуй.** Эта команда должна выполнить не только тесты, но также Rollup/Svelte сборку и проверить версию `dist/plugin.json`, `dist/package.json`.

После успешной проверки:

```bash
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
git diff --cached --stat
git commit -m "Release Windy Flight Route Analyzer v1.2.0 (clean)"
git push origin main
```

Если GitHub отклоняет `push` из-за нового коммита (например, действия синхронизации AIRAC):

```bash
git fetch origin
git pull --rebase origin main
git push origin main
```

Если появится `CONFLICT`, **не выполняй `push --force`** — сначала разреши конфликт.

## Публикация

GitHub → Actions → **publish-plugin** → **Run workflow** → `main`. Выбирай **новый Run workflow**, не `Re-run jobs` от старой версии. В логе шага **Confirm Windy version to be published** должно быть `Publishing Windy plugin version: 1.2.0`.

Секрет `WINDY_API_KEY` нужен в GitHub только для публикации. В Vercel ничего настраивать не нужно.

## Проверка UTC

На маршруте UUEE–UNNT выбери дату в горизонте прогноза Windy и время 18:00 UTC. После «Сформировать ссылку» URL должен завершаться на `?YYYY-MM-DD-18`. Измени время на 21:00 UTC — старая ссылка должна исчезнуть; повторное формирование должно закончиться `-21`. Сначала сравни предварительный просмотр URL, затем открой штатный Windy. При необходимости скопируй URL и открой вручную в Safari.

Временные слоты Windy в данном формате имеют шаг 3 часа; GPX содержит точное введённое UTC.
