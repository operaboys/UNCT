# ADR-017 — Export Engine Dependencies: `fflate` (ZIP) and `uqr` (QR)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `08-EXPORT_ENGINE` §6-7, `14-DEPENDENCY_POLICY` §1, §2.1, §6.2 |
| **Anti-Chaos Rule** | Rule 13 (Architecture Freeze / new Dependency requires ADR) |

## Context

`14-DEPENDENCY_POLICY` §1 already lists "ZIP Utility" and "QRCode Generator" as approved
*categories* (carried over from the original blueprint pass), but names no specific package for
either. The Dependency Lock Rule (§6.2) requires, before any dependency enters the project: a
Blueprint Reference, an Architecture Review, a Security Review, and a recorded Performance Impact.
A category name alone does not satisfy that — this ADR closes the gap for both, using the same
criteria table ADR-001 (Preact) established as the project's template.

## Decision

Adopt:
- **`fflate@0.8.3`** (MIT) for ZIP Export (doc 08 §7 — Project Snapshot/Backup/multi-file export).
- **`uqr@0.1.3`** (MIT) for QR Export (doc 08 §6 — Single Node / Multi QR Pages). Originally
  `qrcode-generator@2.0.4` was adopted here; superseded by `uqr` per the Addendum below.

## Review

| معیار | fflate | uqr |
|---|---|---|
| Active Maintenance | ✅ نگهداری فعال، استفاده‌ی وسیع | ✅ نگهداری فعال توسط تیم unjs (pi0/antfu)، انتشار اخیر |
| Small Footprint | ✅ تنها توابع ZIP استفاده می‌شوند (Tree-Shakeable)؛ بدون وابستگی به Node Buffer | ✅ بدون Dependency؛ صادرات جدا (`encode` از رندررها مستقل است) — واقعاً Tree-Shakeable، برخلاف `qrcode-generator` |
| Security Review | ✅ بدون اجرای کد دلخواه؛ ورودی = بایت‌های خودِ Export Engine (UNM، نه فایل خارجی)؛ بدون Network/FS access | ✅ بدون اجرای کد دلخواه؛ ورودی = رشته‌ی متنی (محتوای Export شده)، بدون رندر HTML خام، بدون DOM/Canvas |
| MIT Compatible License | ✅ MIT | ✅ MIT |
| عدم نقض Zero-Backend | ✅ کاملاً Client-side، بدون نیاز به Build Step اضافه | ✅ کاملاً Client-side |
| Performance Impact | ~8KB gzip کامل پکیج؛ فقط `zipSync`/`strToU8` استفاده می‌شود | ~4.4KB gzip واقعی در Bundle نهایی (فقط `encode`) — جزئیات در Addendum دوم |

هر دو معیار Bundle Size Budget (`14-DEPENDENCY_POLICY` §2.1) را برآورده می‌کنند — مجموع این دو به
بودجه‌ی ۱۵۰KB کل Dependencyهای خارجی نزدیک نمی‌شود؛ اندازه‌ی gzip واقعی بعد از هر افزودن در
`scripts/build.js`'s output اندازه‌گیری و در گزارش Checkpoint مربوطه ثبت می‌شود (نه تخمین).

## Consequences

- `core/exporter/to-zip.js` و `core/exporter/to-qr.js` این دو پکیج را مستقیماً Import می‌کنند
  (`to-qr.js` اکنون `uqr` را، طبق Addendum دوم پایین صفحه)؛ هیچ‌کدام به `ui/` وابسته نیستند
  (ADR-004: Exporter در `core/` می‌ماند).
- نسخه‌ها Pin شده‌اند (`14-DEPENDENCY_POLICY` §6.1) — هر Upgrade آینده نیاز به عبور از Baseline
  Dataset و یک Architecture Review جدید دارد، حتی برای Patch Version.
- `14-DEPENDENCY_POLICY` §1 به‌روزرسانی شد تا این دو ردیف از‌قبل‌تأییدشده‌ی عمومی را به پکیج
  مشخص‌شان پیوند دهد.

## Addendum (2026-06-27) — Bundle Size Ceiling Resolution

`14-DEPENDENCY_POLICY` §2.1 سقف «UI Layer (Preact + Component‌ها) ≤ 50KB (gzip)» را تعریف کرده،
ولی از زمان ADR-014 (که `ui/` و `core/` را در یک artifact واحد، `assets/js/app.js`، Bundle می‌کند)
این سقف عملاً روی gzip کل آن فایل (نه فقط کد `ui/`) سنجیده می‌شده — خودِ `scripts/build.js` این
سؤال را «هنوز باز، موکول به آینده» اعلام کرده بود.

افزودن `fflate` (`zipSync`/`strToU8`) این سؤال را غیرقابل‌تعویق کرد: اندازه‌ی واقعی gzip
`app.js` از **46186 بایت (45.10 KiB)** به **51244 بایت (50.04 KiB)** رسید — حدود ۴۴ بایت
(۰.۰۹٪) بالاتر از سقف نوشته‌شده. علت، کدِ واقعی الگوریتم DEFLATE داخل `fflate` است (~۵KB بعد از
gzip) که برای ساخت ZIP واقعی (نه ادعایی) غیرقابل‌حذف است؛ سقف دیگر بخش ۲.۱ («کل Dependencyهای
خارجی ≤ ۱۵۰KB») با فاصله‌ی زیاد رعایت می‌شود.

**تصمیم (تأیید مهدی):** این Overage جزئی پذیرفته و ثبت می‌شود، نه نادیده گرفته. عدد اندازه‌گیری‌شده
(۵۱۲۴۴ بایت) به‌عنوان Baseline جدید در `14-DEPENDENCY_POLICY` §2.1 ثبت شده تا Checkpointهای بعدی
نسبت به این عدد، نه عدد قدیمی ۴۶۱۸۶، سنجیده شوند — طبق همان سؤال «UI Layer باید بازتعریف شود»
که `scripts/build.js` از قبل مطرح کرده بود: حالا که `ui/` و `core/` یک Bundle واحدند، این سقف
عملاً سقف «کل Bundle نهایی»، نه فقط `ui/`، است.

## Addendum 2 (2026-06-28) — QR Library Swap: `qrcode-generator` → `uqr`

پس از افزودن `qrcode-generator` برای QR Export، اندازه‌گیری واقعی gzip نشان داد `app.js` از
Baseline ۵۱۲۴۴ بایت به **59660 بایت (58.26 KiB)** رسید — Overage حدود **8416 بایت (16.4٪)**،
بسیار بیشتر از تخمین اولیه‌ی این سند (~3KB). علت با تحلیل esbuild `metafile` و بازبینی مستقیم
سورس (`qrcode-generator/dist/qrcode.mjs`, 2237 خط) پیدا شد: کل کتابخانه یک Factory Function
یکپارچه است — همه‌ی Rendererها (شامل یک GIF Encoder کامل و رندرر Canvas/Table/ASCII) به‌صورت
Closure داخل همان تابع واحد تعریف شده‌اند، نه Export جدا. در نتیجه Tree-Shaking غیرممکن است؛
حتی با فراخوانی فقط ۴ متد (`addData`/`make`/`getModuleCount`/`isDark`)، کل ماژول (~52KB Raw)
وارد Bundle می‌شود.

**بررسی جایگزین:** `uqr@0.1.3` (MIT، نگهداری‌شده توسط تیم unjs — pi0/antfu، بدون Dependency،
انتشار ~۲ ماه پیش). برخلاف `qrcode-generator`، صادرات این کتابخانه در سطح ماژول ESM واقعاً جداست:
`export { encode, renderANSI, renderSVG, renderUnicode, renderUnicodeCompact }` — یعنی Import فقط
`encode` واقعاً Rendererهای استفاده‌نشده را Tree-Shake می‌کند. اندازه‌گیری در یک Probe مجزا (فقط
`encode`، Bundle+Minify+Gzip جدا از پروژه): ~3914 بایت — نزدیک به تخمین اولیه‌ی ADR.

**تصمیم (تأیید مهدی، «بله، عوض کن»):** `qrcode-generator` حذف و `uqr@0.1.3` جایگزین شد. بعد از
ادغام واقعی در پروژه (`core/exporter/to-qr.js` با `import { encode } from "uqr"`)، اندازه‌گیری
نهایی gzip `app.js`: **55651 بایت (54.35 KiB)** — Overage نسبت به Baseline ۵۱۲۴۴ بایت معادل
**4407 بایت (8.6٪)**، در همان مقیاس Overage پذیرفته‌شده‌ی `fflate` (نسبتاً)، نه Overage ۸۴۱۶
بایتی `qrcode-generator`. این عدد به‌عنوان Baseline جدید در `14-DEPENDENCY_POLICY` §2.1 ثبت
می‌شود؛ سقف «کل Dependencyهای خارجی ≤ ۱۵۰KB» همچنان با فاصله‌ی زیاد رعایت می‌شود. `npm audit`
تأیید کرد `uqr` (بدون Dependency) هیچ Vulnerability جدیدی وارد نمی‌کند.
