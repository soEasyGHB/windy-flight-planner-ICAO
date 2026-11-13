# Установка Windy Flight Route Analyzer 1.2.3

Версия **1.2.3** указана одновременно в `package.json` и `src/pluginConfig.ts`. Архив содержит актуальные исходники, тесты и GitHub Actions. Экспериментальный `rplanner` handoff удалён.

## GitHub Codespaces

1. Загрузи `Windy-Flight-Route-Analyzer-FULL-v1.2.3.zip` в корень репозитория.
2. Запусти:

```bash
git switch main
git fetch origin
git pull --ff-only origin main
unzip -o Windy-Flight-Route-Analyzer-FULL-v1.2.3.zip
node tools/clean-legacy.mjs --dry-run
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

3. **Только после успешной сборки и проверки списка удаления** выполни:

```bash
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
git diff --cached --stat
git commit -m "Release Windy Flight Route Analyzer v1.2.3"
git pull --rebase origin main
git push origin main
```

4. Затем GitHub → Actions → `publish-plugin` → `Run workflow` → `main`. В логах ожидается `Publishing Windy plugin version: 1.2.3`. Не запускай `Re-run jobs` от старого релиза.

`WINDY_API_KEY` в GitHub Secrets нужен только для публикации самого плагина. Ключи погодных API не нужны.

## Проверка интерфейса

- Убедись, что **«Точное UTC (эксперимент)»** отсутствует и блок планировщика содержит кнопки «Скачать GPX» и «Сформировать план».
- Поля даты и времени вылета по центру, компактные, текст центрирован. После формирования ссылки появляется «Открыть планировщик».
- Проверь `2026-11-16 05:01 UTC` → URL оканчивается `?2026-11-16-05`; `05:31` → `?2026-11-16-06` (слоты кроме трёхчасовых могут игнорироваться Windy).
- Проверить GPX с точным временем `05:01`, правильными аэропортами и именами точек.
- Изменение времени должно обнулять старый URL; после этого сформируй план заново.

Скрипт `cleanup:legacy` удаляет устаревший проектный код и старые архивы, **сохраняя** `navdata-input/`, `public/navdata/` и `.git`. Перед удалением просмотри `--dry-run`.
