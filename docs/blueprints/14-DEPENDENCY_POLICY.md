# BLUEPRINT 14 — DEPENDENCY POLICY

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — افزودن استثنای Preact (تغییر مهم) |
| **Priority** | HIGH |

> ⚠️ **مهم‌ترین تغییر این سند:** نسخه‌ی اصلی صراحتاً می‌گفت «React/Vue/Angular ممنوع». این قانون با تصمیم اتخاذشده (استفاده از Preact برای حذف ساخت دستی State/Render Engine — اسناد 09، 11، 13) در تناقض بود. این بازنویسی آن تناقض را با افزودن یک **استثنای صریح و محدود** برطرف می‌کند.

## Philosophy

Minimal Dependencies · Maximum Control

---

## 1. Approved Libraries

| کتابخانه | نقش | وضعیت |
|---|---|---|
| **Preact** | UI Framework (Reactivity + Virtual DOM) | ✅ **جدید — استثنای تأییدشده** |
| `htm` (اختیاری) | جایگزین JSX بدون نیاز به Build Step | ✅ تأییدشده (همراه Preact) |
| js-yaml | YAML Parsing/Serialization | تأییدشده (نسخه‌ی قبلی) |
| Dexie Adapter (اختیاری) | لایه‌ی کمکی روی IndexedDB | تأییدشده (نسخه‌ی قبلی) |
| QRCode Generator | تولید QR Code | تأییدشده (نسخه‌ی قبلی) — **پکیج مشخص: `qrcode-generator` (ADR-017، Phase 9 Export Engine)** |
| ZIP Utility | ساخت/خواندن فایل ZIP | تأییدشده (نسخه‌ی قبلی) — **پکیج مشخص: `fflate@0.8.3` (ADR-017، Phase 9 Export Engine)** |
| **DOMPurify** | HTML Sanitization / XSS Protection | 🔴 **REQUIRED** *(اصلاح‌شده — بازبینی اولویت ۳؛ Used In: Export Engine, HTML Preview, Report Rendering — اگر Export HTML و Import داده‌ی خارجی وجود دارد، این Dependency اختیاری نیست)* |
| **Testing Framework** | Automated Testing | ⏳ Phase 1 Decision Required — **Candidates:** Vitest, Jest, Web Test Runner *(بازبینی اولویت ۳؛ هنوز انتخاب نهایی نشده). 💭 یادآوری (بازبینی نهایی): این دومین بار است که `Vitest` به‌عنوان گزینه‌ی برتر پیشنهاد می‌شود (سازگار با ESM، سریع) — همچنان تصمیم نهایی با مهدی است، نه یک انتخاب خودکار.* |
| **Preact Testing Library** | Component Testing | ⏳ Phase 9 Decision Required *(جدید — بازبینی نهایی؛ همراه با انتخاب Testing Framework اصلی تصمیم‌گیری می‌شود)* |
| یک کتابخانه‌ی Virtual List سبک | رندر لیست‌های ۱۰,۰۰۰+ آیتمی (طبق سند 13) | ⏳ نیاز به انتخاب دقیق در Phase 9 — **باید Actively Maintained باشد** (پیشنهاد بازبینی؛ بعضی کتابخانه‌های Virtual Scroll سال‌هاست آپدیت نشده‌اند) |
| Comlink (Google) | تسهیل ارتباط Worker ↔ Main Thread | 🔸 **NOT Approved Yet** *(جدید — بازبینی نهایی؛ پیشنهاد شد ولی هنوز تأیید نشده — Web Worker با `postMessage` خام طبق سند 10 از قبل کار می‌کند؛ Comlink فقط Syntactic Sugar اضافه می‌کند، نه قابلیت جدید. باید قبل از Phase 5 طبق Rule بخش ۵ همین سند بررسی شود، نه پیش‌فرض پذیرفته شود)* |

---

## 1.1 Approved Runtime APIs *(جدید — پیشنهاد بازبینی)*

> این موارد کتابخانه نیستند — Web API های مرورگر هستند که مستقیماً در پروژه استفاده می‌شوند و باید به‌عنوان وابستگی رسمی (نه چیزی پیش‌فرض/نامرئی) ثبت شوند:

- Web Workers (سند 10)
- IndexedDB (بخش ۴ همین سند)
- File System Access API (Import/Export فایل، در صورت پشتیبانی مرورگر)
- Clipboard API (Quick Copy، سند 07)
- Compression Streams API (در صورت نیاز به فشرده‌سازی ZIP بدون کتابخانه‌ی خارجی)
- AbortController (Task Cancellation، اسناد 10 و 13)

> **قانون:** هرکدام از این APIها در صورت عدم پشتیبانی مرورگر، باید Graceful Fallback داشته باشند (نه Crash).

---

## 2. استثنای Preact — چرا این مورد خاص است؟

طبق Rule «Future Dependency Review» (بخش ۵ همین سند)، هر Dependency جدید نیاز به تأیید معماری دارد. این تأیید برای Preact به دلایل زیر صادر شد:

| معیار سند اصلی | بررسی Preact |
|---|---|
| Active Maintenance | ✅ نگهداری فعال |
| Small Footprint | ✅ ~3KB (gzip) — در مقابل ~45KB+ React |
| Offline Compatibility | ✅ کاملاً سازگار؛ بدون نیاز به Build Step (با `htm`) |
| MIT Compatible License | ✅ MIT |
| عدم نقض Zero-Backend | ✅ فایل JS استاتیک — همچنان با باز کردن یک HTML اجرا می‌شود |

> این استثنا **فقط برای Preact** صادر شده، نه برای کل خانواده‌ی React-like. هرگونه فریم‌ورک دیگر همچنان باید Rule بخش ۵ را طی کند.

## 2.1 Bundle Size Budget *(جدید — بازبینی نهایی)*

**Status:** REQUIRED

> ⚠️ **ریسک واقعی:** Preact خودش ~۳KB است، ولی افزودن کتابخانه‌های جانبی (Router، Hooks افزودنی، Virtual List، YAML Parser، ZIP Utility) می‌تواند به‌مرور این عدد را چند برابر کند — بدون این‌که هیچ Dependency واحد به‌تنهایی «بزرگ» به نظر برسد (مرگ تدریجی، نه ناگهانی).

| سقف | مقدار |
|---|---|
| UI Layer (Preact + Componentها) | ≤ 50KB (gzip) — **Baseline اندازه‌گیری‌شده (Phase 9، پس از ADR-017): 51244 بایت (50.04 KiB)، تأییدشده توسط مهدی به‌عنوان Overage جزئی پذیرفته‌شده (دلیل: کدِ DEFLATE واقعیِ `fflate`، غیرقابل‌حذف برای ZIP واقعی)** |
| کل Dependencyهای خارجی (Preact + YAML + ZIP + QR + Virtual List + ...) | ≤ 150KB (gzip) — با فاصله‌ی زیاد رعایت می‌شود |

**قانون:** قبل از هر Release، اندازه‌ی Bundle نهایی باید اندازه‌گیری شود (مثلاً با `source-map-explorer` یا ابزار مشابه در زمان توسعه، نه به‌عنوان Runtime Dependency). عبور از سقف بدون تأیید معماری مجاز نیست — جزئیات این تأیید برای Overage فعلی در `ADR-017-EXPORT-DEPENDENCIES.md`'s Addendum ثبت شده. از این Checkpoint به بعد، Checkpointهای جدید باید نسبت به Baseline ۵۱۲۴۴ بایت (نه عدد قدیمی) سنجیده شوند؛ هر Overage جدید نسبت به این Baseline هم باز نیاز به تأیید معماری مجزا دارد.

---

## 3. Forbidden Frameworks (به‌روزرسانی‌شده)

| فریم‌ورک | وضعیت |
|---|---|
| React | ❌ ممنوع (حجم بالا، نیاز معمول به Build Step) |
| Vue | ❌ ممنوع |
| Angular | ❌ ممنوع |
| Next.js / Nuxt | ❌ ممنوع (هر دو Backend-oriented و در تناقض با Zero-Backend) |
| ~~Preact~~ | ✅ دیگر ممنوع نیست — طبق بخش ۲ |

**دلیل ممنوعیت بقیه:** Framework Lock-In · Bundle Bloat · Unnecessary Complexity

---

## 4. Storage Layer

| | |
|---|---|
| Primary | Native IndexedDB |
| Secondary | Dexie Adapter (اختیاری) |
| قانون | اپلیکیشن باید بدون Dexie هم کار کند |

## 5. YAML Policy

بدون Parser سفارشی برای YAML — استفاده از یک YAML Engine اثبات‌شده (js-yaml).

---

## 6. Future Dependency Review

هر Dependency جدید (غیر از موارد تأییدشده‌ی بالا) نیاز به تأیید معماری دارد، طبق همین فرآیندی که برای Preact طی شد (جدول معیار در بخش ۲ به‌عنوان الگو استفاده شود).

## 6.1 Dependency Upgrade Policy *(جدید — پیشنهاد بازبینی)*

**Status:** REQUIRED

- بدون Upgrade خودکار (No Automatic Upgrade) — هر Dependency با نسخه‌ی Pin‌شده (Locked Version) استفاده می‌شود.
- هر Upgrade نیاز دارد به:
  - عبور از Testing Framework (سند 15) — Baseline Test Dataset باید Pass شود
  - تأیید معماری (Architecture Review) — حتی برای یک Patch Version

> **دلیل:** یک Upgrade بی‌خبر در `js-yaml` یا `Preact` می‌تواند رفتار Parsing یا Rendering را به‌طور نامحسوس تغییر دهد — این نوع باگ‌ها معمولاً دیرتر از همه کشف می‌شوند.

## 6.2 Dependency Lock Rule *(جدید — پیشنهاد بازبینی)*

**Status:** REQUIRED

هر Dependency جدید، قبل از ورود به پروژه، باید:

- **Blueprint Reference** داشته باشد (در همین سند ثبت شود)
- **Architecture Review** شود (طبق Rule 13 سند ANTI_CHAOS — ADR در صورت نیاز)
- **Security Review** شود
- **Performance Impact** آن ثبت شود (حجم، تأثیر روی زمان بارگذاری)

> **قانون مطلق:** هیچ Dependency بدون ثبت در همین سند وارد پروژه نمی‌شود — این قانون جلوی شلوغ‌شدن تدریجی و کنترل‌نشده‌ی پروژه را می‌گیرد.

---

## 7. Document Control

| Field | Value |
|---|---|
| نسخه | v2.7 |
| اصلاحات نسبت به v2.6 | (Phase 9 Export Engine) ثبت پکیج مشخص برای دو ردیف از‌قبل‌تأییدشده‌ی عمومی: `fflate@0.8.3` برای ZIP Utility، `qrcode-generator@2.0.4` برای QRCode Generator — طبق Dependency Lock Rule (بخش ۶.۲)، با جزئیات کامل در `ADR-017-EXPORT-DEPENDENCIES.md` |
| اصلاحات نسبت به v2.5 | (بازبینی نهایی) ثبت یادآوری دومین پیشنهاد Vitest برای Testing Framework — بدون تصمیم‌گیری خودسرانه |
| اصلاحات نسبت به v2.4 | (بازبینی نهایی) افزودن Bundle Size Budget (Section 2.1)؛ افزودن Preact Testing Library به Candidate List؛ ثبت Comlink به‌عنوان Dependency پیشنهادی-ولی-تأییدنشده (نیاز به بررسی قبل از Phase 5) |
| سند بعدی | `15-BLUEPRINT_TESTING_FRAMEWORK` |
