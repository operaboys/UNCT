# ADR-017 — Export Engine Dependencies: `fflate` (ZIP) and `qrcode-generator` (QR)

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
- **`qrcode-generator@2.0.4`** (MIT) for QR Export (doc 08 §6 — Single Node / Multi QR Pages).

## Review

| معیار | fflate | qrcode-generator |
|---|---|---|
| Active Maintenance | ✅ نگهداری فعال، استفاده‌ی وسیع | ✅ نگهداری فعال (پورت استاندارد kazuhikoarase QR library)، استفاده‌ی وسیع |
| Small Footprint | ✅ تنها توابع ZIP استفاده می‌شوند (Tree-Shakeable)؛ بدون وابستگی به Node Buffer | ✅ بدون وابستگی به Canvas/DOM/Node — فقط ماتریس خام برمی‌گرداند، رندر (SVG/Table) در `ui/` |
| Security Review | ✅ بدون اجرای کد دلخواه؛ ورودی = بایت‌های خودِ Export Engine (UNM، نه فایل خارجی)؛ بدون Network/FS access | ✅ بدون اجرای کد دلخواه؛ ورودی = رشته‌ی متنی (محتوای Export شده)، بدون رندر HTML خام |
| MIT Compatible License | ✅ MIT | ✅ MIT |
| عدم نقض Zero-Backend | ✅ کاملاً Client-side، بدون نیاز به Build Step اضافه | ✅ کاملاً Client-side |
| Performance Impact | ~8KB gzip کامل پکیج؛ فقط `zipSync`/`strToU8` استفاده می‌شود | ~3KB gzip؛ فقط الگوریتم QR Matrix، بدون رندرر داخلی |

هر دو معیار Bundle Size Budget (`14-DEPENDENCY_POLICY` §2.1) را برآورده می‌کنند — مجموع این دو به
بودجه‌ی ۱۵۰KB کل Dependencyهای خارجی نزدیک نمی‌شود؛ اندازه‌ی gzip واقعی بعد از هر افزودن در
`scripts/build.js`'s output اندازه‌گیری و در گزارش Checkpoint مربوطه ثبت می‌شود (نه تخمین).

## Consequences

- `core/exporter/to-zip.js` و `core/exporter/to-qr.js` این دو پکیج را مستقیماً Import می‌کنند؛
  هیچ‌کدام به `ui/` وابسته نیستند (ADR-004: Exporter در `core/` می‌ماند).
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
