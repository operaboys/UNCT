# Handoff: UNCT — Liquid Glass UI Redesign

## Overview
Complete visual redesign for **UNCT (Universal Network Config Toolkit)** — an offline-first, browser-based tool for importing, parsing, validating, converting, and exporting proxy/VPN node configurations (VLESS, VMESS, Trojan, SS, Hysteria2, WireGuard).

The design language is **"Liquid Glass"**: real glassmorphism panels (backdrop blur + saturation) floating over ambient radial glows on a deep navy canvas. It fully supports **dark + light themes**, **Persian (RTL) + English (LTR)**, and **desktop + mobile responsive layouts** — all four combinations of theme × language must work on both form factors.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, NOT production code to copy directly. Your task is to **recreate these designs in the UNCT codebase's environment** (per its blueprints: vanilla JS / web-based, offline-first) using its established patterns. The prototype's logic (fake node counts, hardcoded YAML output) must be replaced with the real UNCT core (parser, converter, validator).

`UNCT-App-Offline.html` is a fully self-contained bundle — open it in any browser to interact with the design (theme switch, language switch, all 8 pages, responsive mobile mode below 760px width).

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows and interactions are final. Recreate pixel-perfectly. All styling values below are exact.

## Architecture of the design

### Theming — CSS custom properties on `body`
Theme is switched by setting `data-theme="light"` on `<body>` (dark is default). ALL components reference only the variables — never hardcoded colors — so both themes work automatically. Full token table in **Design Tokens** below.

### Localization / direction
Language is a state (`fa` | `en`). The app root gets `dir="rtl"` (fa) or `dir="ltr"` (en). All layout uses **logical properties** (`margin-inline-start`, `inset-inline-end`, `text-align:start`) so RTL/LTR flips automatically. Code/log/URL content is always `direction:ltr` regardless of UI language (wrap those blocks in `direction:ltr`). All UI strings exist in both languages (see the `fa` / `en` dictionaries inside `UNCT App.dc.html` logic — copy them verbatim).

### Responsive
Breakpoint: **760px**.
- ≥760px: floating top pill navigation, multi-column grids.
- <760px: top nav pills hidden; **floating glass dock** fixed at bottom (4 main sections + "More"); "More" opens a **glass bottom sheet** with all 8 sections in a 2-col grid; content stacks single-column; converter/extractor arrow rotates to vertical (↓); analyzer table gets horizontal scroll (min-width 640px inner); page bottom padding 110px to clear the dock.

## Screens (8)

### 1. Dashboard (نمای کلی / Overview)
Two-column grid `1fr 1.55fr`, gap 18px.
- **Left — Health ring card**: glass panel, radius 24px, padding 26px. Ring: 230px circle, `conic-gradient(var(--ok) 0 324deg, var(--ring-track) 324deg 360deg)` (= 90%), inner hole 186px `var(--ring-hole)` with 44px JetBrains Mono bold "90%" in `var(--ok)` + caption 12px. Below: 3 equal stat chips (warning 94 / errors 32 / recovered 21) — radius 14px, tinted backgrounds (`--warn-bg`/`--err-bg`/`--info-bg`), 20px mono bold numbers.
- **Right column**: (a) **Drop zone** — glass panel radius 24px with `1.5px dashed var(--acc-bd)` border, background `var(--acc-soft)`; 52px gradient icon tile (radius 18px) with "⇣"; title 15px/700, sub 12px; "Choose file" button inline-end. (b) **Recent imports** — glass panel; rows radius 16px `var(--glass2)` bg with 34px format icon tile (B64/URL/YML, mono 10px), filename mono 12.5px LTR, meta 10.5px, confidence % mono inline-end colored ok/warn. Footer: protocol chips row (radius 99px, mono 11.5px LTR: "VLESS 512" highlighted with `--acc-soft`/`--acc-bd`/`--acc-txt`, rest neutral glass).

### 2. Converter (مبدل)
Grid `1fr 64px 1fr` (desktop). Two glass panels + center circular arrow button (46px, gradient, glyph ← for RTL / → for LTR / ↓ mobile).
- **Input panel**: header row — title, auto-detect badge (pill, `--acc-soft` bg, mono 10.5px), actions Paste/File/Clear (radius 9px, 11px). Body: syntax-highlighted node URIs, mono 11.5px, line-height 1.9, LTR; protocol scheme colored: vless `var(--acc1)`, vmess `var(--info)`, trojan `var(--purp)`, ss `var(--warn)`, hysteria2 `var(--ok)`. Footer: "6 nodes · 100% parsed" in `--ok` mono.
- **Output panel**: header — title + format tabs (Clash Meta / sing-box / v2rayN / Base64; pills radius 99px mono 11px; active = `var(--pill-active)` + inset highlight). Body: YAML with keys `var(--acc-txt)`, strings `var(--txt)`, numbers `var(--warn)`, booleans `var(--ok)`, comments/indent `var(--txt3)`. Footer: primary "Copy output" (gradient button radius 10px), secondary "Save file", filename mono inline-end.

### 3. Analyzer (تحلیلگر)
Filter chips row (All 1,284 / Valid 1,158 / Warnings 94 / Errors 32) — active chip `--pill-active`. Glass table: header row mono 10.5px `var(--txt3)`; columns `1.2fr .8fr 1.2fr .8fr .6fr` (NAME, PROTO, HOST, status, confidence); rows 13px padding, bottom border `var(--glass2-bd)`; proto badge pill (`--acc-soft`); status badge pill colored by kind (valid/warn/err with matching `-bg`/`-bd`); confidence mono colored. Footer: "Showing 6 of 1,284" + primary "Re-validate" gradient button. Filters actually filter rows.

### 4. Subscriptions (اشتراک‌ها)
Search bar (glass, radius 16px, "⌕ Search 1,284 nodes…") + 46px gradient "+" button. Cards grid `repeat(3,1fr)` (1-col mobile): each glass card radius 22px, padding 18px — icon tile + filename mono + meta, confidence %, 6px progress bar (gradient green `#3ECF8E→#5FE3AC` or amber `#E8B44A→#F0C670` by health), action buttons Update / Export / Remove (Remove in `var(--err)`).

### 5. Extractor (استخراج‌گر)
Same split layout as Converter. Left "Raw text": messy chat-style text (LTR, 12px, line-height 2) where detected URIs are highlighted inline (`--acc-soft` bg, radius 5px, mono 10.5px). Right "Found links": count badge (`--ok-bg` pill), extracted rows like Recent imports; footer "Add all to collection" (gradient primary) + "Copy output".

### 6. Export Center (مرکز خروجی)
Status bar (glass, lock-ok style): "1,158 valid nodes selected for export" + "Change selection" link. Cards grid `repeat(3,1fr)`: Clash Meta (.yaml), sing-box (.json), v2rayN/NG (.txt), Raw links (.txt), QR codes (.png), WireGuard (.conf). Each: 42px icon tile (mono 2-letter, tinted per card), name 14px/700 LTR, description 11.5px, "Export" button + extension mono inline-end.

### 7. Developer Console (کنسول)
Full-height glass panel. Header: `ic-code.png` icon, title, "unct-core v0.1" badge, Copy log / Clear buttons. Log body: mono 12px LTR line-height 2.1 — timestamps `var(--txt3)`, actions `var(--info)`, success `var(--ok)`, warnings `var(--warn)`, errors `var(--err)`, prompt line `var(--acc-txt)` with block cursor. Footer: prompt row "> " + placeholder + gradient ↵ button.

### 8. Settings (تنظیمات)
Single glass panel, max-width 760px centered. Rows (17px 22px padding, divider `var(--glass2-bd)`):
1. **Default theme** — segmented control ☾/☀ (pill group: container `--glass2` radius 99px padding 4px; active segment `--pill-active` + inset highlight)
2. **Interface language** — segmented فا/EN
3–6. **Toggle rows** with 40px icon tile (`--acc-soft` bg, radius 13px) using brand icons: shield=strict validation, speedometer=auto-repair, network=dedupe, lock=telemetry (telemetry is **locked off**, opacity .55, not clickable). Toggle: 46×26px track, gradient when on, 18px white knob, animated 0.2s.
7. **Data** — "Wipe all data" danger button (`--err-bg`/`--err-bd`/`--err`).

## Chrome (all screens)

### Splash screen
On app load, fixed overlay `var(--bg)` z-100: ambient glows, full brand lockup image 230px wide, 210×6px loading bar (track `--track`, fill gradient `#8B5CF6→#0EA5E9` animating width 8%→96% over 1.4s ease-out), "LOADING…" mono 10px letter-spacing 3px. Fades out (opacity keyframe, 75%→100%) and unmounts at 1.6s.

### Top pill nav (desktop)
Self-centered pill: radius 99px, glass bg, padding 8px 10px. Contents: **brand lockup image** (height 58px), 1px divider, 8 nav pills (12.5px, active = `--pill-active` + inset top highlight + weight 600), divider, language toggle (mono 11.5px "EN"/"فا"), theme toggle (☾/☀ in `#E8C56A`).

### Mobile dock + sheet
Dock: fixed 14px from edges/bottom, radius 24px, glass, 5-col grid (Overview / Converter / Subscriptions / Export / More), 11px labels, active = white + 700. Sheet: fixed bottom, radius 30px 30px 0 0, stronger glass, drag handle 44×5px, header = minimal U icon (26px) + "All sections", 2-col grid of section cards (radius 18px, active = `--pill-active`), backdrop `rgba(6,8,18,.45)`.

### Footer badge
Centered pill: `--ok-bg`/`--ok-bd`, lock icon 13px, "Offline · everything stays on your device" 11.5px.

## Interactions & Behavior
- Theme/language toggles: instant, no reload; theme sets `body[data-theme]`; language flips `dir` on root.
- Nav: client-side page switching (single-page state).
- Converter format tabs and Analyzer filters are stateful.
- Settings toggles persist in state (production: persist to localStorage).
- Hover: interactive text elements brighten to `var(--txt)`.
- No scroll-into-view; sheet closes on backdrop click or item selection.
- Splash runs once per load; keep it snappy (≤1.6s), skip entirely on subsequent in-app navigation.

## State Management
`theme` ('dark'|'light'), `lang` ('fa'|'en'), `page` (8 ids), `format` (converter tab), `filter` (analyzer), `settings` {validate, repair, dedupe, telemetry}, `moreOpen` (mobile sheet), viewport width listener for the 760px breakpoint (or CSS media queries in production). Persist theme/lang/settings to localStorage.

## Design Tokens

### Fonts
- UI: **Vazirmatn** (400/500/600/700/800) — Persian+Latin, works for both languages
- Code/numbers/badges: **JetBrains Mono** (400/500/600/700)
- Both from Google Fonts. Numbers in stats always mono.

### Brand accent (from the brand sheet)
- Gradient (buttons, icon tiles, arrows, toggles-on, loading bar): `linear-gradient(135deg, #8B5CF6, #0EA5E9)`
- Primary button shadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 8px 20px rgba(14,165,233,.45)`

### Dark theme (default)
| Token | Value |
|---|---|
| --bg | #0A0D1C |
| --glow1/2/3 | radial rgba(14,165,233,.4) / rgba(94,201,238,.25) / rgba(216,148,240,.2) |
| --glass | rgba(255,255,255,.06) |
| --glass-bd | rgba(255,255,255,.13) |
| --glass-hi (inset top) | rgba(255,255,255,.2) |
| --glass2 / --glass2-bd | rgba(255,255,255,.05) / rgba(255,255,255,.09) |
| --pill-active / --pill-hi | rgba(255,255,255,.14) / rgba(255,255,255,.25) |
| --divider | rgba(255,255,255,.12) |
| --txt / --txt2 / --txt3 | #F2F3F8 / #A5AAC4 / #8B90AC |
| --ok / -bg / -bd | #5FE3AC / rgba(95,227,172,.09) / rgba(95,227,172,.25) |
| --warn / -bg / -bd | #F0C670 / rgba(232,180,74,.09) / rgba(232,180,74,.22) |
| --err / -bg / -bd | #F58C8C / rgba(239,106,106,.09) / rgba(239,106,106,.22) |
| --info / -bg / -bd | #8CD9F2 / rgba(94,201,238,.09) / rgba(94,201,238,.25) |
| --acc1 / --acc2 | #8B5CF6 / #0EA5E9 |
| --acc-soft / --acc-bd / --acc-txt | rgba(14,165,233,.18) / rgba(139,92,246,.3) / #7DD3FC |
| --purp / -bg / -bd | #E7BCF5 / rgba(216,148,240,.15) / rgba(216,148,240,.3) |
| --ring-track / --ring-hole | rgba(255,255,255,.09) / rgba(10,13,28,.85) |
| --code / --track | #9DA3BE / rgba(255,255,255,.08) |
| --shadow | 0 16px 48px rgba(0,0,0,.35) |

### Light theme (`body[data-theme="light"]`)
| Token | Value |
|---|---|
| --bg | linear-gradient(160deg,#E9EBFA,#F3EEFA 55%,#EAF2F7) |
| --glow1/2/3 | rgba(139,92,246,.38) / rgba(94,201,238,.3) / rgba(216,148,240,.26) |
| --glass / --glass-bd / --glass-hi | rgba(255,255,255,.55) / rgba(255,255,255,.8) / rgba(255,255,255,.92) |
| --glass2 / --glass2-bd | rgba(255,255,255,.62) / rgba(255,255,255,.88) |
| --pill-active / --pill-hi | rgba(255,255,255,.9) / rgba(255,255,255,1) |
| --divider | rgba(26,29,48,.12) |
| --txt / --txt2 / --txt3 | #1A1D30 / #565C74 / #7A80A0 |
| --ok / --warn / --err / --info | #17966A / #B07D0E / #C74747 / #1F7FAE (each with matching ~.1 bg and ~.3 bd rgba) |
| --acc-soft / --acc-bd / --acc-txt | rgba(14,165,233,.12) / rgba(14,165,233,.32) / #0369A1 |
| --purp | #A44FC4 |
| --ring-track / --ring-hole | rgba(26,29,48,.1) / rgba(255,255,255,.82) |
| --code / --track | #4A5064 / rgba(26,29,48,.09) |
| --shadow | 0 16px 48px rgba(80,80,140,.16) |

### Glass panel recipe (the signature style)
```css
background: var(--glass);
backdrop-filter: blur(30px) saturate(180%);
border: 1px solid var(--glass-bd);
box-shadow: inset 0 1px 0 var(--glass-hi), var(--shadow);
border-radius: 24px; /* panels; 22 cards; 18 small; 99px pills */
```
Ambient glows behind content: 3 fixed radial-gradient circles (~380–680px), `pointer-events:none`.

### Scales
- Radii: 99px pills · 24px panels · 22px cards · 16–18px rows/tiles · 9–13px buttons/small tiles
- Spacing: 18px grid gap (14 mobile) · 20–26px panel padding · 8–14px row gaps
- Type: 44 ring number · 19–20 page titles (mobile) · 14–15 panel titles · 12.5–13.5 body · 11–12 secondary · 10–10.5 badges/mono captions

## Assets (in `assets/`)
All extracted from the user's own brand sheet (background knocked out to transparent):
- `unct-lockup.png` — full logo: mark + UNCT wordmark + "UNIVERSAL NETWORK CONFIG TOOLKIT" + Persian tagline. Used in nav header (58px tall) and splash (230px wide).
- `unct-logo.png` — mark only (U + orbit nodes N/C/T). Small-size contexts.
- `unct-icon.png` — minimal mono U icon. Mobile sheet header; suitable favicon source.
- `ic-shield.png`, `ic-speed.png`, `ic-network.png`, `ic-lock.png`, `ic-code.png`, `ic-bars.png` — blue line feature icons (settings rows, console header, offline badge; `ic-bars` free for analyzer).
Production: consider re-vectorizing to SVG from the original design files for crispness.

## Files
- `UNCT App.dc.html` — the design source (template + logic). Read the two `fa`/`en` dictionaries in the script for all copy.
- `UNCT-App-Offline.html` — self-contained interactive bundle; open in a browser to explore every state.
- `assets/` — brand images listed above.
