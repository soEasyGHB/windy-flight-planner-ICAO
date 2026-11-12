# Windy Flight Route Analyzer v0.8.6 — установка на iPad через GitHub Codespaces

**Это полный архив исходников.** Распаковывается в корень существующего репозитория, без вложенной папки. База данных в `public/navdata` не заменяется.

1. В Codespaces открой корень репозитория (там, где `package.json`). Убедись, что важные незакоммиченные изменения сохранены.
2. Загрузи `Windy-Flight-Route-Analyzer-FULL-v0.8.6.zip` через Explorer → Upload.
3. В терминале выполни:

```sh
unzip -o Windy-Flight-Route-Analyzer-FULL-v0.8.6.zip
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

4. Только если все проверки успешны, сохрани в GitHub:

```sh
git add .github/ src/ tests/ tools/ package.json rollup.config.js svelte.config.js tsconfig.json README.md INSTALL-v0.8.6-iPad.md AUDIT-v0.8.6.md .gitignore LICENSE public/index.html public/navdata/.gitkeep navdata-input/README.md

git commit -m "Full release v0.8.6: fix-only route, persistence, dark UI"
git push origin main
```

5. GitHub → Actions → `publish-plugin` → Run workflow (ветка **main**).

## Изменения

- Полный OFP можно вставлять вместе с ATS (`Y12`, `M56` и т. д.). На карту и в GPX попадают только распознанные именованные FIX и ICAO аэродромов. ATS-трассы отбрасываются, поэтому линии **прямые между точками**, а не фактическая траектория по трассам.
- Уточнение по безопасности: неизвестный FIX остаётся разрывом, координаты не выдумываются, неполный GPX содержит только отдельные подтверждённые участки.
- Сохраняются маршрут, дата UTC и время UTC в `localStorage` Safari для того же домена/устройства; на другом iPad, при приватном просмотре или после очистки данных браузера сохранение не гарантируется.
- Стартовый слой — «Грозы»; при повторном открытии снова выбирается «Грозы».
- Фиксированные вычисления FL360 и TAS 450 kt (без поправки на ветер и реальную трассу). Эти поля больше не отображаются.
- Основные карточки затемнены. Поля даты/времени вертикальные, шириной до 190 px и не выходят за контейнер.
- Остальные функции оставлены в закрытых «Настройках», как раньше.

Важно: расчётные прямые линии и ETA **не предназначены для навигации**. Реальные ATS/STAR/SID, эшелоны и время следует проверять по официальным данным OFP/FMS/брифинга.
