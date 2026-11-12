# Установка v0.11.1 в GitHub Codespaces (iPad или компьютер)

Этот ZIP содержит **полную версию исходников**, которую нужно наложить на существующий репозиторий. Версию плагина внутри Windy менять не требуется: сохраняется идентификатор `windy-plugin-flight-route-analyzer`.

1. В корень репозитория в Codespaces загрузи `Windy-Flight-Route-Analyzer-FULL-v0.11.1.zip`.
2. Выполни следующий блок в терминале из корня репозитория (старые исходники из предыдущих версий удаляются намеренно):

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.11.1.zip

npm run cleanup:legacy

npm install --no-audit --no-fund
npm run test:release
```

**Если `npm run test:release` завершилась ошибкой, не публикуй обновление.** Пришли текст первой ошибки из Codespaces.

3. Если все тесты и сборка прошли, сохрани изменения:

```bash
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
git commit -m "Simplify Windy plugin to GPX and navigation databases v0.11.1"
git push origin main
```

4. Открой GitHub → Actions → `publish-plugin` → Run workflow → main. Для публикации нужен Secret `WINDY_API_KEY`, как прежде. **Ключ прогноза и Vercel не нужны.**
5. Перезагрузи Windy, построй маршрут и нажми «Скачать GPX» (на iPad появится «Поделиться» → «Сохранить в Файлы») либо «Открыть штатный планировщик Windy» (без маршрута и настроек).

### Навигационная база

Продолжают работать `build-navdata.yml` и `sync-gdrive-navdata.yml`. GitHub Variables → `GDRIVE_NAVDATA_FOLDER_URL` содержит ссылку на общедоступную папку Google Drive с ZIP (`earth_fix.dat`, `earth_nav.dat`, `earth_awy.dat` одного AIRAC). На GitHub синхронизация создаёт файлы `public/navdata/*`. Их не нужно удалять при обновлении плагина.

### Ограничения

Кнопка «Скачать GPX» сначала пытается открыть системное меню `navigator.share` на iPad. Если браузер не поддерживает передачу файла, та же кнопка запускает обычное браузерное скачивание. Повторное нажатие может потребоваться, если системное меню завершилось ошибкой. Кнопка штатного планировщика только отправляет `rqstOpen` без дополнительных параметров; если это событие не поддерживается и приводит к ошибке, открывает `https://www.windy.com/distance` в новой вкладке. Результат открытия необходимо проверить в своей версии Windy. GPX не заменяет маршрут OFP и не гарантирует соответствие актуальному AIRAC/ATS.
