# Установка Windy Flight Route Analyzer 2.0

Номер релиза в исходниках: **2.0.1** в `package.json` и `src/pluginConfig.ts`. Это новая версия: Windy не примет повторную публикацию существующего номера.

## Обновление через GitHub Codespaces

1. Откройте `main` репозитория и убедитесь, что незакоммиченные изменения сохранены.
2. Загрузите `Windy-Flight-Route-Analyzer-FULL-v2.0.1.zip` в **корень репозитория**.
3. В терминале:

```bash
git switch main
git fetch origin
git pull --ff-only origin main
unzip -o Windy-Flight-Route-Analyzer-FULL-v2.0.1.zip
node tools/clean-legacy.mjs --dry-run
npm run cleanup:legacy
npm install --no-audit --no-fund
npm run test:release
```

Перед настоящей очисткой убедитесь по `--dry-run`, что среди удаляемых файлов нет нужных пользовательских изменений. Навигационные исходники `navdata-input/` и готовый снимок `public/navdata/` сохраняются.

4. **Только после успешной компиляции и тестов**:

```bash
git add -A -- . ':(exclude)*.zip' ':(exclude)*.sha256'
git status --short
git diff --cached --stat
git commit -m "Release Windy Flight Route Analyzer v2.0.1"
git pull --rebase origin main
git push origin main
```

5. На GitHub выберите **Actions → publish-plugin → Run workflow → main**. Не запускайте повторно старый workflow через `Re-run jobs`. В журнале должно быть `Publishing Windy plugin version: 2.0.1`.

`WINDY_API_KEY` в GitHub Secrets используется только для публикации плагина; Vercel и ключи погодного API не нужны.

## Проверка интерфейса

- В поле маршрута написано «Маршрут из OFP».
- Время и дата визуально отцентрированы по вертикали и горизонтали внутри полей на настольном браузере и на iPad (визуальную проверку устройства выполняют после публикации).
- «Сформировать план» и «Открыть планировщик» работают как в 1.2.3. URL содержит `/route-planner/ifr/`. Специального переключателя Airspeed в URL **нет**.
- В навигационных настройках одна кнопка «Проверить базу данных», нет кнопок прямой загрузки или ручной синхронизации. Остальные workflows сохранены.
- GPX сохраняет имена точек и точный ETD UTC.

## Обновление навигационной базы

Пользовательская инструкция в плагине указывает только Google Drive папку [Windy-NAVDATA](https://drive.google.com/drive/folders/14eS_Ir19Uv7FPc2cVZWBR6_yKBvGTu5C). В ней требуется заменять один файл `navdata.zip`, включающий `earth_fix.dat`, `earth_nav.dat`, `earth_awy.dat` одного цикла AIRAC. Сохранённый workflow `sync-gdrive-navdata` ожидает один ZIP, работает по расписанию (`03:31 UTC`, ежедневно), если задана переменная `GDRIVE_NAVDATA_FOLDER_URL`, и публикует преобразованные данные. Это не новая ручная функция плагина.

В настройках остаётся одна кнопка «Проверить базу данных»; она загружает уже опубликованный результат. Сразу после замены ZIP обновление может быть ещё недоступно. Навигационные данные в релиз не включены из-за возможных лицензионных ограничений.
