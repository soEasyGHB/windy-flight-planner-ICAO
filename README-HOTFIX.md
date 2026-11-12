# Hotfix для Windy Flight Route Analyzer v0.8.1

Исправляет ошибку Rollup `Could not resolve "./flightAltitude" from "src/plugin.svelte"`.

1. Загрузите ZIP в корень проекта Codespaces.
2. Выполните `unzip -o Windy-Flight-Route-Analyzer-v0.8.1-ALTITUDE-HOTFIX.zip`.
3. Проверьте отсутствующие локальные импорты: `node tools/check-plugin-deps.mjs`.
4. Выполните `npm run typecheck:core && npm test && npm run build`.
5. Только после успешной сборки:
   `git add src/flightAltitude.ts tests/test_flight_altitude.mjs tools/check-plugin-deps.mjs && git commit -m "Fix missing altitude module v0.8.1" && git push origin main`.

Архив не заменяет `plugin.svelte`, `routePlanner.ts`, `package.json`, конфигурацию Windy или навигационную базу. Сохранён номер версии 0.8.1. Если такая версия уже опубликована, для повторной публикации в Windy потребуется новый номер версии.
