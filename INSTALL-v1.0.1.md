# Установка Windy Flight Route Analyzer 1.0.1 — GitHub Codespaces

Релиз обновляет существующий плагин с тем же ID `windy-plugin-flight-route-analyzer` и не стирает `public/navdata/` или `navdata-input/`.

## 1. Файлы и тесты

Загрузи ZIP в **корень репозитория** рядом с `package.json`. Запусти целиком:

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v1.0.1.zip
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

Скрипт `cleanup:legacy` удаляет старые функции и тесты, но не трогает файлы навигационных баз. Последняя команда запускает тесты TypeScript/GPX/UTC, компиляцию Rollup/Svelte и проверку `dist`. **Если какая-либо команда завершилась ошибкой, не публикуй плагин.**

## 2. GitHub

Выполнять только после успешного `npm run test:release`:

```bash
git ls-files -z 'Windy-Flight-Route-Analyzer-FULL-v*.zip' 'Windy-Flight-Route-Analyzer-FULL-v*.sha256' | xargs -0 -r git rm --cached --
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
# Проверь изменения, затем:
git commit -m "Fix GPX UTC, names and flight filenames v1.0.1"
git push origin main
```

Если рабочая ветка не `main`, подставь её имя. Затем в GitHub → Actions → `publish-plugin` → Run workflow → выбери ветку. Для публикации остаётся Secret `WINDY_API_KEY`; для данных маршрута ключ не нужен.

## 3. Проверка после публикации

1. Открой плагин, выбери UTC ETD и введи тестовый маршрут `UUEE24C DCT UNNT25` (аэропорт UNNT должен находиться в подключённой базе).
2. После «Построить маршрут» нажми «Скачать GPX»: имя файла `UUEE-UNNT.gpx`. На iPad — «Сохранить в Файлы».
3. В GPX должен быть UTC `Z` в `<time>` на вылете; `<name>` для каждого FIX есть и в `wpt`, и в `rtept`.
4. Открой штатный планировщик: плагин запрашивает синхронизацию **общей временной шкалы прогноза**. Убедись, что требуемое время вылета действительно выбрано в самом планировщике Windy. Если дата за пределами прогноза, Windy может её не принять.
5. После импорта GPX Windy может по-прежнему показывать номера. В 2026 году есть сообщения об ошибке Windy, скрывающей имена точек; это не означает, что `<name>` отсутствует в файле.
6. Для диагностики открой «Настройки → Ошибки и предупреждения».

## Ограничения

Без установленного `node_modules` полная сборка в этой среде невозможна; выполняй `npm run test:release` в Codespaces. Данный исходный архив не является готовым `dist` и не гарантирует, что Windy перенесёт GPX-время или метки в штатный планировщик.
