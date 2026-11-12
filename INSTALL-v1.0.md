# Установка Windy Flight Route Analyzer v1.0 (GitHub Codespaces)

Это полные **исходники** версии `1.0.0` для существующего репозитория. ID `windy-plugin-flight-route-analyzer` оставлен без изменений, настройки GitHub-навигационных баз и сохранённый маршрут не сбрасываются.

## 1. Заменить файлы

Загрузи `Windy-Flight-Route-Analyzer-FULL-v1.0.zip` в **корень** GitHub Codespaces (рядом с `package.json`), затем выполни:

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v1.0.zip
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

`cleanup:legacy` удаляет известные устаревшие модули, старые тесты, исторические файлы `AUDIT/INSTALL` и загруженные ZIP-архивы. **Не удаляет** пользовательские файлы навигационных баз, `public/navdata/`, `navdata-input/` и другие неизвестные данные. В архиве отсутствуют `node_modules`, `dist` и ранее удалённые метеомодули.

Если `npm run test:release` не завершился успешно — не публикуй. Команда должна выполнить настоящую сборку Rollup/Svelte в Codespaces и проверить файлы `dist/plugin.js`, `dist/plugin.min.js`, `dist/plugin.json`, `dist/package.json`.

## 2. Удалить старые архивы и сохранить исходники в GitHub

После успешных проверок:

```bash
# Удалить из Git только старые релизные ZIP и контрольные суммы, если они отслеживались:
git ls-files -z 'Windy-Flight-Route-Analyzer-FULL-v*.zip' 'Windy-Flight-Route-Analyzer-FULL-v*.sha256' | xargs -0 -r git rm --cached --

# Добавить все изменения, в том числе удаления устаревших файлов:
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short

# Проверив список изменений:
git commit -m "Release Windy Flight Route Analyzer v1.0"
git push origin main
```

Проверь `git status` перед `commit`, особенно нет ли случайных пользовательских файлов. Если репозиторий использует другую ветку, замени `main` на свою. Архив не требует публикации в репозитории.

## 3. Публикация Windy

GitHub → Actions → `publish-plugin` → Run workflow → выбери нужную ветку. Необходим уже настроенный GitHub Secret `WINDY_API_KEY` **для публикации плагина**. Vercel и Point Forecast API в версии 1.0 не используются.

## 4. Контроль после публикации

1. Перезагрузи Windy, открой плагин и построй маршрут `UUEE24C DEMO2A DCT ABAGI DCT KUDAS DCT ARR9C FSIA31` при доступной базе указанных точек.
2. Убедись, что цифровые SID/STAR на краях маршрута не вызывают разрыв; проверь реальные координаты FIX в базе.
3. Выбери дату и время UTC, нажми «Скачать GPX», импортируй файл в штатный планировщик Windy. Метки в GPX именованные; Windy может всё равно показывать номера.
4. Открой «Настройки → Ошибки и предупреждения»: статус GPX теперь находится только там.

## Важное ограничение

Без установленных зависимостей полная сборка Rollup/Svelte не выполнится. Нельзя считать локальные TypeScript- и функциональные тесты заменой `npm run test:release` в Codespaces. GPX и карта не предназначены для рабочей аэронавигации.
