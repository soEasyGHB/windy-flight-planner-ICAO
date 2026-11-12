# Аудит v1.0.2

Восстановлен прежний экспериментальный метод передачи массива координат штатному планировщику Windy. В отличие от кнопки открытия пустого планировщика, новая третья кнопка передаёт `{coords,view:'ifr'}` и предварительно устанавливает `store.timestamp` по ETD UTC.

Добавлен `src/nativePlannerHandoff.ts`: выбор непрерывного подтверждённого участка, строгая UTC-валидация, резервная ссылка на публичный формат Windy `/distance/...`, ограничение длины URL, явные ограничения передачи точного времени и GPX XML.

Тесты: `tests/test_native_planner_handoff.mjs`, имитация вызова в `tools/check-plugin-startup.mjs`. Полная сборка Rollup требует установленного npm в GitHub Codespaces.

## Результаты локальной проверки

- `npm test`: PASS, включая новый тест прямого handoff, GPX, UTC, iPad Share и smoke-test обработчиков Svelte.
- `npm run check:tree`, `check:build-config`, `check:imports`, `check:exports`, `typecheck:core`: PASS.
- `npm run build`: НЕ ВЫПОЛНЕН — `rollup: not found`. Полную компиляцию Svelte/публикацию необходимо проверить в GitHub Codespaces.
- Запуск в реальном интерфейсе Windy/iPad: НЕ ПРОВЕРЕН.

Точная передача файла GPX вместе с ETD встроенному Windy не поддерживается документированным интерфейсом; новая третья кнопка не утверждает, что такой импорт состоялся.
