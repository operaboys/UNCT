# MASTER FILE STRUCTURE v1.1

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — هماهنگ‌سازی با تصمیم Preact |
| **وابسته به** | 09-DEVELOPMENT_ROADMAP, 14-DEPENDENCY_POLICY |

> ⚠️ **تغییر نسبت به نسخه‌ی اصلی:** پوشه‌های جدا برای `state/` و `render/` که در ساختار اصلی پیشنهاد شده بود حذف شدند (چون این دو مسئولیت اکنون توسط Preact پوشش داده می‌شود — اسناد 11 و 13). به‌جای آن، یک پوشه‌ی `ui/components/` برای Componentهای Preact و یک پوشه‌ی `core/worker/` برای Web Worker Engine (سند 10) اضافه شده است.

---

## ساختار پوشه‌ها

```
UNCT/
├── index.html
│
├── assets/
│   ├── css/
│   │   ├── core.css
│   │   ├── theme.css
│   │   ├── layout.css
│   │   └── components.css
│   │
│   ├── js/
│   │   ├── app.js              ← نقطه‌ی ورود اصلی (mount Preact root)
│   │   ├── router.js
│   │   └── constants.js
│   │   (⚠️ state.js حذف شد — به core/store/ منتقل شد)
│   │
│   └── icons/
│
├── core/
│   ├── types/                     ← ✅ جدید (بازبینی اولویت ۳): تعریف‌های مشترک TypeScript — UNMNode, AnalysisObject, ValidationObject, ConversionObject, BaseParser, ErrorCodes (تا پراکنده نشوند بین unm/schema و parser/base)
│   │
│   ├── unm/                       ← ✅ جدید: UNM به‌عنوان قلب پروژه، پوشه‌ی اختصاصی خودش (Rule 10 سند ANTI_CHAOS)
│   │   ├── schema/                ← تعریف Enumها و Validation Rules مربوط به UNM (Typeها خودشان در core/types/ هستند)
│   │   ├── mapper/                ← منطق Normalization و originalMappings
│   │   └── registry/              ← ⚠️ اصلاح‌شده (بازبینی اولویت ۳): **UNM Schema Registry** — نگه‌داری نسخه‌های Schema و قوانین Migration بین نسخه‌ها (نه Runtime Node Storage؛ آن مسئولیت `core/store/` است — این دو همپوشانی ندارند)
│   │
│   ├── importer/
│   ├── detector/
│   ├── parser/
│   │   ├── base/                ← BaseParser Contract (سند 12) — Interface در core/types/ تعریف می‌شود
│   │   ├── xray/
│   │   ├── singbox/
│   │   ├── clash/
│   │   ├── url/
│   │   ├── subscription/
│   │   └── wireguard/
│   │
│   ├── validator/
│   ├── normalizer/
│   ├── analyzer/
│   │   ├── core/                ← Protocol/Security/TLS/Network/Reality (Spec قطعی)
│   │   └── extended/             ← Cloudflare/Worker/DNS/Subscription/Compatibility (نیمه‌قطعی)
│   │
│   ├── converter/
│   ├── exporter/                 ← تصمیم عمدی (بازبینی اولویت ۳): Export به‌عنوان Core Capability دیده شده، نه Feature UI — ثبت در `docs/adr/ADR-004-EXPORTER-IN-CORE.md` تا بعداً جابه‌جا نشود
│   ├── worker/                   ← ✅ جدید: Web Worker Engine (سند 10)
│   │   ├── worker-manager.js
│   │   ├── parser.worker.js      ← ⚠️ فقط Wrapper — منطق واقعی در core/parser/ است (توضیح زیر)
│   │   ├── analyzer.worker.js    ← ⚠️ فقط Wrapper — منطق واقعی در core/analyzer/ است
│   │   └── converter.worker.js   ← ⚠️ فقط Wrapper — منطق واقعی در core/converter/ است
│   │
│   └── store/                    ← ✅ جدید: Context/Hooks ساده به‌جای state.js (سند 11)
│       ├── parserState.js
│       ├── analyzerState.js
│       └── settingsState.js
│
├── ui/                            ← ✅ بازطراحی‌شده برای Preact
│   ├── components/                ← Componentهای مشترک/قابل‌استفاده‌ی مجدد
│   ├── dashboard/
│   ├── converter/
│   ├── analyzer/
│   ├── extractor/
│   ├── subscription/              ← شامل Virtual List Component (سند 13)
│   ├── export/
│   └── settings/
│
├── plugins/
│
├── reports/
│
├── tests/
│   ├── baseline-dataset/          ← ✅ جدید: محل فیزیکی Baseline Test Dataset (سند 15 — Mandatory)
│   ├── xray/
│   ├── singbox/
│   ├── clash/
│   ├── subscriptions/
│   └── regression/
│
└── docs/
    ├── blueprints/
    ├── architecture/
    ├── adr/                       ← ✅ جدید: Architecture Decision Records (طبق Rule 13 سند ANTI_CHAOS)
    │   ├── ADR-001-PREACT.md
    │   ├── ADR-002-UNM-FIRST.md
    │   └── ADR-003-WORKER-ARCHITECTURE.md
    ├── changelog/
    └── specifications/
```

---

## Worker vs Core Logic — Separation of Concerns *(جدید — بازبینی نهایی)*

> ⚠️ **رفع ابهام واقعی:** سؤال «منطق Parser کجاست؟ `core/parser/xray/` یا `core/worker/parser.worker.js`؟» باید صریحاً جواب داده شود، وگرنه دو مشکل واقعی پیش می‌آید: (۱) اگر منطق داخل Worker نوشته شود، Unit Test کردن Parser بدون شبیه‌سازی کامل Worker سخت/غیرممکن می‌شود — نقض اصل Testability (سند 15)؛ (۲) همان منطق در دو جا تکرار می‌شود.

**قانون رسمی:**

| لایه | مسئولیت |
|---|---|
| `core/parser/`, `core/analyzer/`, `core/converter/` | **منطق خالص و Sync.** کاملاً مستقل از Worker — قابل Import و تست مستقیم در محیط Unit Test (طبق Testing Infrastructure، سند 15)، بدون نیاز به شبیه‌سازی Thread جداگانه. |
| `core/worker/*.worker.js` | **فقط Wrapper.** پیام را از `postMessage` می‌گیرد، تابع متناظر در `core/parser/`/`core/analyzer/`/`core/converter/` را صدا می‌زند، و نتیجه را برمی‌گرداند. هیچ منطق Business اینجا نوشته نمی‌شود. |

> این دقیقاً همان الگویی است که سند ۰۹ (Phase 3 → Phase 5) و سند ۱۲ (`isAsync`/`parseAsync`) توصیف می‌کنند: Parser همیشه Sync و قابل‌تست می‌ماند؛ Worker فقط آن را در پس‌زمینه اجرا می‌کند.

---

## نکات کلیدی تغییرات

| مورد | قبل | بعد |
|---|---|---|
| State | `assets/js/state.js` (دستی) | `core/store/` (Hooks/Context مبتنی بر Preact) |
| Render | پوشه‌ی مستقل `render/` | حذف شد — مسئولیت داخل خود Componentهای `ui/` |
| Worker | پراکنده / تعریف‌نشده در ساختار اصلی | `core/worker/` به‌صورت صریح اضافه شد |
| Analyzer | یک پوشه‌ی یکپارچه | تفکیک `core/` و `extended/` هم‌راستا با سند 06 |
| Parser | یک پوشه‌ی یکپارچه | زیرپوشه‌ی `base/` برای Contract + زیرپوشه به‌ازای هر پروتکل |
| UNM | بدون پوشه‌ی مستقل (مخلوط بین Parser/Normalizer) | پوشه‌ی اختصاصی `core/unm/` *(جدید — پیشنهاد بازبینی)* |
| Baseline Dataset | بدون محل فیزیکی مشخص | `tests/baseline-dataset/` *(جدید — پیشنهاد بازبینی)* |
| ADR | وجود نداشت | `docs/adr/` *(جدید — پیشنهاد بازبینی)* |
| Shared Types | پراکنده بین `unm/schema` و `parser/base` | پوشه‌ی متمرکز `core/types/` *(جدید — بازبینی اولویت ۳)* |
| UNM Registry | مبهم (Cache یا Source of Truth؟) | رسماً **UNM Schema Registry** تعریف شد؛ Runtime Storage مسئولیت `core/store/` می‌ماند *(اصلاح‌شده — بازبینی اولویت ۳)* |

---

## Current Project Readiness (به‌روزرسانی‌شده)

| بخش | وضعیت |
|---|---|
| Architecture | در حال بازنویسی نهایی (همین فرآیند) |
| Data Model (UNM) | ✅ دقیق‌سازی شده (سند 05) |
| Blueprints | در حال بازنویسی سیستماتیک (فایل‌های ۰۱ تا ۱۹) |
| Coding Phase | ⏳ پس از تکمیل بازنویسی همه‌ی بلوپرینت‌ها |

---

## Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) رفع ابهام محل منطق Parser/Analyzer/Converter در برابر Worker — قانون رسمی Separation of Concerns (منطق خالص در core/X/، Worker فقط Wrapper) |
| اصلاحات نسبت به v1.2 | (بازبینی اولویت ۳) افزودن `core/types/` (Shared Types/Contracts متمرکز)؛ رفع ابهام `core/unm/registry/` (تعریف رسمی به‌عنوان Schema Registry، نه Runtime Storage)؛ ثبت تصمیم عمدی محل `core/exporter/` در ADR |
| سند بعدی | `ULTIMATE_BLUEPRINT_INDEX` |
