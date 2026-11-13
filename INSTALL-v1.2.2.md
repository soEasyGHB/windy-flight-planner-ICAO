# Установка Windy Flight Route Analyzer 1.2.2

Номер релиза в `package.json` и `src/pluginConfig.ts`: **1.2.2**. ZIP включает весь исходный проект, средства обновления навигационных данных, текущие workflows и тесты. Внутри нет `node_modules`, `dist`, устаревших сборок или документов других релизов.

## Обновление GitHub Codespaces

1. Загрузи `Windy-Flight-Route-Analyzer-FULL-v1.2.2.zip` в корень репозитория.
2. Выполни:

```bash
# Если есть незакоммиченные изменения, сначала проверь git status.
git switch main
git fetch origin
git pull --ff-only origin main
unzip -o Windy-Flight-Route-Analyzer-FULL-v1.2.2.zip
node tools/clean-legacy.mjs --dry-run
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

3. **Только после успеха `npm run test:release`**:

```bash
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
git diff --cached --stat
git commit -m "Release Windy Flight Route Analyzer v1.2.2"
git pull --rebase origin main
git push origin main
```

4. Открой GitHub → Actions → `publish-plugin` → `Run workflow` → `main`. Используй новый запуск, не `Re-run jobs` старого workflow. В логе `Confirm Windy version to be published` должно быть `Publishing Windy plugin version: 1.2.2`.

`WINDY_API_KEY` в GitHub Secrets остаётся необходимым для публикации плагина. Ни Windy Point Forecast, ни Vercel не используются.

## Как протестировать два режима

1. Построй маршрут `UUEE24C DCT UNNT25` с корректной навигационной базой.
2. Введи `2026-11-16`, `05:01` UTC. Нажми **«1. Сформировать URL (ближайший час)»**. Ссылка должна оканчиваться на `?2026-11-16-05`. Скопировать URL можно вручную из текстового поля, специальной кнопки больше нет. ВНИМАНИЕ: `05` — недокументированный час в публичной ссылке; проверь, какое время показывает Windy.
3. Измени UTC на `05:31`, сформируй снова: ожидается `?2026-11-16-06`, документированный трёхчасовой слот.
4. Нажми **«2. Точное UTC через API (эксперимент)»** при `05:01`. Эта кнопка использует `@windy/store` для точного времени погодной карты и затем отправляет координаты в `rplanner`. Она не создаёт URL с минутами. В «Настройки → Ошибки и предупреждения» смотри фактически принятое время и факт `redrawFinished`. **ETD штатного планировщика проверь визуально**; его автоматическая установка не гарантирована.
5. Проверь, что «Скачать GPX» сохраняет точное `05:01` UTC.

Очистка удаляет только известные устаревшие проектные модули и архивы; сохраняет `navdata-input/`, `public/navdata/` и `.git`. `--dry-run` нужен для предварительного просмотра списка.
