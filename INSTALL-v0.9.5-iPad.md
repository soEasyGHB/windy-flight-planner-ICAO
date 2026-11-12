# Windy Flight Route Analyzer v0.9.5 — полная сборка для Codespaces/iPad

Основа — полностью проверенный исходный архив v0.9.4 с исправлением открытия метеопрофиля. **Не отдельный HOTFIX**.

## 1. Установка

В GitHub Codespaces открой корень проекта (`package.json` и папка `src`). Сначала сохрани свои незакоммиченные изменения, если они есть. Загрузи `Windy-Flight-Route-Analyzer-FULL-v0.9.5.zip` через Explorer → Upload.

```bash
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.9.5.zip
npm install
npm run check:tree
npm run check:imports
npm run check:exports
npm run typecheck:core
npm test
rm -rf dist
npm run build
npm run verify:release
```

Ожидаемый результат последней команды: `PASS: ready to publish version 0.9.5`. **Не публикуй плагин**, если `npm run build` или `npm run verify:release` не прошли.

## 2. Сохранение в GitHub

```bash
git add .github/ src/ tests/ tools/ package.json README.md rollup.config.js svelte.config.js tsconfig.json .gitignore LICENSE public/index.html public/navdata/.gitkeep navdata-input/README.md INSTALL-v0.9.5-iPad.md AUDIT-v0.9.5.md
git commit -m "Release v0.9.5 fix weather profile feedback and loading"
git push origin main
```

Если `git commit` сообщает `nothing to commit`, проверь статус (`git status`) и ветку.

## 3. Публикация

GitHub → Actions → `publish-plugin` → `Run workflow` → `main`. Убедись, что версия в `dist/plugin.json` — `0.9.5`. Windy не принимает уже существующую версию; если `0.9.5` опубликована, потребуется повысить номер **и** в `package.json`, **и** в `src/pluginConfig.ts`.

## 4. Проверка исправления

1. Открой плагин Windy и вставь маршрут (или используй сохранённый).
2. Введи ETD UTC, выбери FL330–390.
3. Открой **Настройки → Прогноз и таблицы FL300–FL400 → Получить профиль и открыть**.
4. Нижняя панель должна появиться **сразу**, затем показать загрузку по именованным точкам и график.
5. Если ошибка — её текст отображается непосредственно в нижней панели и под кнопкой. Нажми «Повторить запрос» после устранения причины.

Схема маршрута без ATS, имена FIX, GPX, сохранение маршрута/FL/ETD, ветер по компонентам, цветовая заливка ISA и линия тропопаузы остались без изменений.

## Ограничения

Прогноз запрашивается у Open-Meteo и зависит от сети и доступности даты/параметров. Удалять неизвестные FIX из OFP без проверки нельзя: полный прогноз корректно блокируется при неподтверждённых разрывах. Продукт не предназначен для оперативной навигации или официального предполётного брифинга.
