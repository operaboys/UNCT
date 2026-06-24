# BLUEPRINT 02 — SYSTEM ARCHITECTURE

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | STABLE — بدون تغییر در منطق، فقط بازآرایی فرمت |
| **وابسته به** | 01-MASTER_BLUEPRINT |

---

## 1. Core Flow

```
UI (Outside Pipeline)
   ↓ triggers
Importer → Format Detector → Parser → [Normalization Process] → UNM (Output) → Validation → Analyzer → Converter → Exporter
```

این مسیر، قانون اصلی جریان داده در کل سیستم است و نباید دور زده شود (مطابق Architectural Law در سند 01).

> 🔗 **شفاف‌سازی مفهومی (بازبینی نهایی):** `Normalizer` یک **فرآیند** است (تابعی که داده‌ی خام Parse‌شده را می‌گیرد)، نه یک موجودیت داده‌ای جدا از UNM. `UNM` همان **خروجی** این فرآیند است. این دو هرگز دو گام مجزا با هویت مستقل نیستند — براکت `[...]` در نمودار برای تأکید بر این تمایز است.

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی:** گره **UNM** اکنون به‌صورت صریح در نمودار نشان داده می‌شود. UNM مهم‌ترین دارایی معماری پروژه است (سند 05) و نباید فقط در پس‌زمینه‌ی Normalizer مخفی بماند — تمام لایه‌های بعدی (Analyzer/Converter/Exporter) مستقیماً از UNM می‌خوانند، نه از خروجی خام Normalizer.

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۱، نکته ۱):** **Validation** اکنون به‌صورت صریح بین UNM و Analyzer در نمودار دیده می‌شود. در نسخه‌های قبلی، Validation در Roadmap (سند 09) و UNM (سند 05) نقش حیاتی داشت ولی در این نمودار اصلی مخفی بود — این مغایرت مستندات اصلاح شد.

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۱، نکته ۴):** **UI** اکنون صریحاً بیرون از Core Pipeline نشان داده می‌شود، نه به‌عنوان یک گام در همان زنجیره‌ی خطی. UI فقط Pipeline را فعال (Trigger) می‌کند و نتایج را نمایش می‌دهد؛ خودش بخشی از پردازش داده نیست. این مرز با Rule 04/11 سند ANTI_CHAOS (جدا بودن UI از منطق Core) هم‌خوان است.

### Architectural Rule — یادآوری از سند 01

> **UNM Is The Only Data Exchange Layer.**
> No Engine May Communicate Directly With Another Engine Using Raw Format Data.

این قانون در `01-MASTER_BLUEPRINT` به‌عنوان Core Law ثبت شده؛ تکرار آن در اینجا برای این است که سند معماری بدون مراجعه به سند دیگر، خودکفا (Self-Contained) باقی بماند.

---

## 2. Importer Engine

**مسئولیت‌ها:**

- File Upload
- Clipboard Paste
- Drag & Drop
- Zip Import
- Subscription Import
- Raw Text Import

---

## 3. Format Detector

**مسئولیت‌ها:**

- Protocol Detection
- Encoding Detection
- File Type Detection
- Structure Detection
- Subscription Detection
- Confidence Scoring

**مثال خروجی:**

| فیلد | مقدار |
|---|---|
| Format | Xray JSON |
| Confidence | 98% |

---

## 4. Parser Engine

**ماژول‌ها:**

- Xray Parser
- Sing-box Parser
- Clash Parser
- Subscription Parser
- URL Parser
- WireGuard Parser
- Batch Parser

> جزئیات کامل در سند `04-BLUEPRINT_PARSER_ENGINE`

---

## 5. Normalizer Engine

> تمام داده‌ها باید به یک ساختار واحد تبدیل شوند: **Universal Node Model (UNM)**

**فیلدهای کلیدی UNM (خلاصه — جزئیات کامل در سند 05):**

Node ID · Protocol · Address · Port · UUID · Password · Network · Security · Host · Path · SNI · ALPN · Fingerprint · PBK · SID · Flow · Remark · Tags · Metadata

---

## 6. Analyzer Engine

> ⚠️ **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۱، نکته ۳):** این لیست به Core/Extended تفکیک شد تا با ساختار سند `06-ANALYZER_ENGINE` کاملاً هم‌راستا باشد (قبلاً فقط یه لیست تخت بود).

**Core Modules** *(Spec قطعی)*
- Protocol Analysis
- Security Analysis
- Structure Analysis *(TLS/Network Analysis)*
- Reality Analysis

**Extended Modules** *(نیمه‌قطعی — Candidate For Optional Module در فاز MVP)*
- Risk Analysis *(Subscription-level)*
- Subscription Analysis
- DNS Analysis
- Cloudflare Analysis
- Worker Analysis
- Clean IP Analysis
- Compatibility Analysis

> در این سند معماری هیچ‌کدام حذف نشده‌اند، فقط باید در نظر داشت که Extended Modules اولویت پایین‌تری دارند (طبق سند 09، Phase 6 در برابر Phase 10).

> جزئیات کامل در سند `06-BLUEPRINT_ANALYZER_ENGINE`

---

## 7. Converter Engine

> ⚠️ **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۱، نکته ۲):** Converter **هرگز** مستقیماً فایل خام (URL/JSON خام) نمی‌خواند. ورودی Converter همیشه یک `UNMNode` است؛ مسیر واقعی این است:
>
> `Raw URL/JSON → Parser → UNM → Converter → Output Format`
>
> فهرست زیر، **خروجی‌های ممکن از UNM** را نشان می‌دهد، نه این‌که Converter خودش این فرمت‌ها را Parse می‌کند (Parse کردن وظیفه‌ی `04-PARSER_ENGINE` است؛ این مرز دقیقاً همان چیزی است که Rule 02/10 سند ANTI_CHAOS الزامی می‌کند).

**ورودی:** `UNMNode` (همیشه، بدون استثنا)

**خروجی‌های ممکن:**
- UNM → URL
- UNM → JSON (Xray)
- UNM → JSON (Sing-box)
- UNM → Clash YAML
- Batch Conversion (روی مجموعه‌ای از UNMNode ها)

---

## 8. Export Engine

- TXT
- JSON
- CSV
- YAML
- QR
- ZIP
- HTML Report

> جزئیات کامل در سند `08-BLUEPRINT_EXPORT_ENGINE`

---

## 9. UI Engine

- Dashboard
- Converter
- Analyzer
- Subscription Center
- Export Center
- Settings
- Debug Console

> جزئیات کامل در سند `07-BLUEPRINT_UI_UX_SYSTEM`

---

## 10. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) شفاف‌سازی مفهومی Normalizer-as-Process در برابر UNM-as-Output در نمودار Core Flow |
| اصلاحات نسبت به v1.2 | (بازبینی اولویت ۱) UI خارج از Core Pipeline نشان داده شد؛ Validation به‌صراحت در Core Flow اضافه شد؛ Converter Engine صریحاً محدود به ورودی UNM شد؛ Analyzer Engine به Core/Extended تفکیک شد |
| سند بعدی | `03-BLUEPRINT_FEATURE_MATRIX` |
