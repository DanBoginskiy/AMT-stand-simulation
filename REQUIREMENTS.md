# Вимоги / Requirements

Машиночитний маніфест залежностей — `package.json`. Цей файл описує системні
вимоги людською мовою. / The machine-readable manifest is `package.json`; this
file documents the requirements for humans.

---

## Системні вимоги / System requirements

| Компонент / Component | Мінімум / Minimum | Рекомендовано / Recommended |
|---|---|---|
| **Node.js** | 18 LTS | 20 або / or 22 LTS |
| **npm** | 9 | 10+ |
| **Браузер / Browser** | будь-який сучасний з підтримкою ES2020, Web Audio API, Canvas 2D та SVG / any modern browser with ES2020, Web Audio API, Canvas 2D and SVG | Chrome / Edge / Firefox / Safari (остання версія / latest) |
| **ОС / OS** | macOS, Linux або / or Windows | — |

> Vite 5 потребує Node ≥ 18. / Vite 5 requires Node ≥ 18.
> Звук відтворюється через **Web Audio API** — потрібен сучасний браузер.
> / Audio playback uses the **Web Audio API** — a modern browser is required.

Перевірити версії / Check versions:

```bash
node -v   # ≥ v18
npm -v    # ≥ 9
```

---

## Залежності проєкту / Project dependencies

### Runtime (`dependencies`)

| Пакет / Package | Версія / Version | Призначення / Purpose |
|---|---|---|
| **vexflow** | `^4.2.5` | Рендер нотного стану — партитура (етап 11). / Music-notation engraving — the score (stage 11). |

### Розробка / Build (`devDependencies`)

| Пакет / Package | Версія / Version | Призначення / Purpose |
|---|---|---|
| **vite** | `^5.4.0` | Dev-сервер та збірка. / Dev server and bundler. |

### Реалізовано вручну (без залежностей) / Hand-rolled (no dependencies)

Для прозорості навчального стенду наступне написано на чистому JS:
/ For the teaching stand's transparency, the following are pure JS:

- **FFT** (radix-2 Cooley–Tukey) — `src/dsp/fft.js`
- **Детектори висоти / Pitch detectors:** YIN, HPS, ACF — `src/dsp/pitchMono.js`
- **Multi-F0** (поліфонія / polyphony) — `src/dsp/pitchPoly.js`
- **Запис MIDI / SMF writer** — `src/export/midiExport.js`
- **Синтез, STFT, онсети, квантизація, метрики / Synthesis, STFT, onsets, quantization, metrics** — `src/synth/`, `src/dsp/`

Жодних бінарних/WASM-залежностей, без бекенду. / No binary/WASM deps, no backend.

---

## Встановлення та запуск / Install & run

```bash
npm install      # встановити залежності / install dependencies
npm run dev      # dev-сервер → http://localhost:5173
```

Збірка статичної версії / Build a static bundle:

```bash
npm run build    # → dist/
npm run preview  # локальний перегляд збірки / preview the build
```
