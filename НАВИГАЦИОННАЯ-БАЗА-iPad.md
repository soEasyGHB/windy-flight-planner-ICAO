# Навигационная база — инструкция для iPad (v0.8.2)

1. На GitHub → Settings → Secrets and variables → Actions → Variables добавьте `GDRIVE_NAVDATA_FOLDER_URL` с HTTPS-ссылкой на публичную Google Drive-папку. В папке должен лежать один ZIP с `earth_fix.dat`, `earth_nav.dat`, `earth_awy.dat` одного AIRAC.
2. Откройте GitHub → Actions → `sync-gdrive-navdata` → Run workflow (ветка main).
3. После успешного конвертирования проверьте в GitHub `public/navdata/manifest.json`: поле `status` должно быть `ready`; `airac_cycle` должен соответствовать исходным файлам.
4. В Windy откройте «Настройки» → «Навигационная база данных» → «Проверить новую базу».
5. Перепубликовывать код Windy из-за смены AIRAC не нужно. Для ручного обновления исходных данных используйте `navdata-input` и workflow `build-navdata`.

Не загружайте в публичную папку базы без разрешения на распространение. Перед использованием проверяйте географию, AIRAC, неоднозначные FIX, направление/высоты трасс и маршрутные разрывы. Плагин не заменяет аэронавигационную базу утверждённого навигационного комплекса.
