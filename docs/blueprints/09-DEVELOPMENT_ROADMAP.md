# BLUEPRINT 09 — DEVELOPMENT ROADMAP

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | MASTER BUILD PLAN — **بازنویسی اساسی نسبت به v1.1** |
| **Version** | 2.0 |

> ⚠️ **چرا این سند به‌طور اساسی بازنویسی شد (نه فقط فرمت):**
> 1. تصمیم گرفته شد به‌جای ساخت دستی State Management Engine و Render Engine، از **Preact** (فریم‌ورک سبک ~3KB، بدون build-step) استفاده شود. این یعنی دو فاز مستقل قبلی (`State Layer` و `Render Engine`) دیگر به‌عنوان موتورهای جداگانه ساخته نمی‌شوند و در دل فاز UI ادغام شدند.
> 2. ماژول‌های Analyzer به Spec قطعی/نیمه‌قطعی تفکیک شدند (سند 06) — این تفکیک در فازبندی هم منعکس شده.
> 3. ترتیب فازها از دو نسخه‌ی موازی و تاحدی متناقض در سند اصلی (یک roadmap کلی + یک roadmap تفصیلی) به **یک roadmap واحد** ساده شد.
>
> هیچ‌کدام از این تغییرات، هدف یا محدوده‌ی نهایی پروژه را تغییر نمی‌دهد؛ فقط مسیر رسیدن به آن را کوتاه‌تر و کم‌ریسک‌تر می‌کند.

---

## نقشه‌ی کلی فازها

```
Phase 0  → Architecture & Blueprints           [انجام‌شده — همین مرحله]
Phase 1  → Foundation Layer (UNM + Validation)
Phase 2  → Parser Infrastructure (Factory)
Phase 3  → Primary Parsers (Xray, URL, Subscription)
Phase 4  → Extended Parsers (Sing-box, Clash, WireGuard)
Phase 5  → Web Worker Engine (پردازش سنگین بدون فریز UI)
Phase 6  → Analyzer Engine — Core Modules
Phase 7  → Converter Engine
Phase 8  → Storage Layer (IndexedDB)
Phase 9  → UI Layer (Preact) + Export Engine
Phase 10 → Analyzer Engine — Extended Modules (Cloudflare/Worker/DNS/...)
Phase 11 → Plugin System
Phase 12 → Advanced / Backlog Features
```

---

## Phase 0 — Architecture

**Deliverables:** Blueprints, Standards, Data Model
**Success Criteria:** 100% Complete ✅ *(همین فاز که الان در حال بازنگری آن هستیم)*

---

## Phase 1 — Foundation Layer

**Priority:** CRITICAL

**Deliverables:**
- Universal Node Model (سند 05)
- Validation Engine
- Error Code Registry
- Recovery Framework (مرز Recovery/Validation طبق سند 04)

**Success Criteria:**
- UNM Stable
- Validation Coverage > 95%
- Error Registry Complete

**Exit Condition:** تمام نمونه‌های نود (Sample Nodes) با موفقیت Normalize می‌شوند.

> 🔗 **Foundation Acceptance Gate** (طبق سند 15-TESTING_FRAMEWORK): این فاز کامل نیست مگر Baseline Test Dataset حداقل ۹۵٪ Pass Rate داشته باشد.

---

## Phase 2 — Parser Infrastructure

**Priority:** CRITICAL

**Deliverables:**
- BaseParser (Contract: detect/parse/validate/normalize/recover)
- ParserFactory
- Confidence Scoring
- Parser Registry

**Success Criteria:** Dynamic Parser Selection, Plugin Ready
**Exit Condition:** افزودن Parser جدید نیاز به تغییر کد Core ندارد (مطابق سند 12).

---

## Phase 3 — Primary Parsers

**Priority:** CRITICAL

> 🔗 **رفع ابهام Sync/Async (بازبینی نهایی):** Parserهای این فاز به‌صورت **Synchronous** (در Main Thread) نوشته و تست می‌شوند — این تناقضی با "Parser باید در Worker باشد" (Phase 5) ندارد. منطق Parsing (`detect/parse/normalize`، طبق سند 12) کاملاً مستقل از این است که در چه Thread ای اجرا می‌شود. Phase 5 فقط یک **Wrapper** دور همین منطق آماده می‌سازد (`postMessage` → اجرای همان تابع → برگرداندن نتیجه)، بدون تغییر در خود Parser. به همین دلیل Parser در Phase 3 قابل تست و Freeze شدن است، بدون انتظار برای Phase 5.

**Deliverables:** Xray Parser, URL Parser, Subscription Parser
**Success Criteria:** 95% Parsing Accuracy, Recovery Enabled
**Exit Condition:** فرمت‌های اصلی (Xray/URL/Subscription) پشتیبانی می‌شوند.

---

## Phase 4 — Extended Parsers

**Priority:** HIGH

**Deliverables:** Sing-box Parser, Clash Parser, WireGuard Parser
**Success Criteria:** All Supported Formats Parse Correctly
**Exit Condition:** Format Matrix کامل می‌شود.

---

## Phase 5 — Web Worker Engine

**Priority:** HIGH

> ⚠️ توجه: این فاز فقط درباره‌ی **Web Worker** (پردازش پس‌زمینه برای جلوگیری از فریز UI) است — نباید با "Cloudflare Worker" (که در Analyzer تحلیل می‌شود) اشتباه گرفته شود.
>
> 🔗 این فاز Parserهای Phase 3/4 را **Wrap** می‌کند، نه Rewrite — طبق توضیح بالا در Phase 3.

**Deliverables:** Worker Manager, Worker Pool, Chunk Processing, Background Tasks
**Success Criteria:** No UI Freeze, Background Parsing Operational
**Exit Condition:** ۱۰,۰۰۰ نود بدون مسدود کردن UI پردازش می‌شود.

---

## Phase 6 — Analyzer Engine (Core Modules)

**Priority:** HIGH

**Deliverables:** Protocol Analyzer, Security Analyzer, TLS Analyzer, Network Analyzer, Reality Analyzer *(طبق سند 06، بخش Spec قطعی)*
**Success Criteria:** Actionable Reports Generated
**Exit Condition:** Risk Report پایه برای هر نود تکی فعال است.

---

## Phase 7 — Converter Engine

**Priority:** HIGH

**Deliverables:** Node→URL, URL→Node, Node→JSON, Node→YAML, Batch Conversion
**Success Criteria:** Round-Trip Conversion Success
**Exit Condition:** هیچ Data Loss در تبدیل رفت‌وبرگشت رخ نمی‌دهد.

---

## Phase 8 — Storage Layer

**Priority:** HIGH

> 💭 **یادداشت بررسی‌شده (بازبینی اولویت ۱، بدون تغییر فازبندی):** یک ترتیب جایگزین (`Analyzer → Storage → Converter → UI`) پیشنهاد شد، با این استدلال که معمولاً بعد از Analyzer نیاز به Persist کردن نتایج است. این یک تفاوت سلیقه‌ی معماری است، نه یک ایراد. ترتیب فعلی (`Converter → Storage → UI`) حفظ می‌شود چون Storage هم باید نتایج Analyzer و هم نتایج Converter را Persist کند؛ قرار گرفتنش بعد از هر دو، منطقی‌تر است.

**Deliverables:** IndexedDB Storage, Storage Abstraction Layer, Backup System
**Success Criteria:** Persistent Data Storage
**Exit Condition:** پروژه‌ها بعد از Restart مرورگر باقی می‌مانند.

---

## Phase 9 — UI Layer + Export Engine

**Priority:** HIGH

> 🔗 این فاز جایگزین دو فاز قبلی «State Layer» و «Render Engine» شده است. Preact به‌صورت توکار Reactivity و DOM Diffing را مدیریت می‌کند؛ برای لیست‌های بزرگ (۱۰,۰۰۰+ نود) یک کتابخانه‌ی Virtual List سبک اضافه می‌شود (نه یک Render Engine سفارشی).

> ⚠️ **قانون معماری جدید (پیشنهاد بازبینی): `Preact Is UI Layer Only`**
> Preact **فقط و فقط** در همین فاز (Phase 9 / پوشه‌ی `ui/`) مجاز است. این یعنی:
> - ❌ Parser نباید Preact بداند چیست.
> - ❌ Analyzer نباید Preact بداند چیست.
> - ❌ Converter نباید Preact بداند چیست.
> - ❌ Core (`core/`) هیچ Import ای از Preact ندارد.
>
> **دلیل:** اگر این مرز شکسته شود، وقتی Plugin System (Phase 11) پیاده‌سازی شود، پلاگین‌ها مجبور می‌شوند فرض کنند که Core به یک UI Framework خاص وابسته است — که اصل Decoupling (سند 01، بخش ۸) را نقض می‌کند.

**Deliverables:**
- Dashboard, Converter, Analyzer, Extractor, Subscription Center, Settings, Developer Console (طبق سند 07)
- Export Engine: TXT, JSON, CSV, YAML, ZIP, HTML Reports, QR (طبق سند 08)

**Success Criteria:** Responsive UI, Mobile Optimized, Export Validation Passed
**Exit Condition:** یک Workflow کامل کاربر (Import → Analyze → Export) ممکن است.

---

## Phase 10 — Analyzer Engine (Extended Modules)

**Priority:** MEDIUM

> 👁️ **یادداشت پایش (پیشنهاد بازبینی، نه تغییر فازبندی):** اگر هدف اصلی برنامه واقعاً تحلیل عمیق کانفیگ باشد (نه فقط تبدیل)، ممکن است بخشی از DNS Analyzer و Cloudflare Analyzer زودتر از آنچه الان برنامه‌ریزی شده مورد نیاز قرار بگیرد. این یک ایراد فعلی نیست — فقط در طول اجرای فاز ۶ تا ۹ باید زیر نظر گرفته شود که آیا تقاضای واقعی کاربر این جابه‌جایی را توجیه می‌کند یا نه.

**Deliverables:** Cloudflare Analyzer, Worker Analyzer, Clean IP Analyzer, DNS Analyzer, Subscription Analyzer, Compatibility Analyzer *(طبق سند 06، بخش نیمه‌قطعی)*
**Success Criteria:** Risk Reports گسترده‌تر و دقیق‌تر
**Exit Condition:** UI Placeholderهای فاز ۹ (مثل Cloudflare Analysis در Analyzer Screen) فعال می‌شوند.

---

## Phase 11 — Plugin System

**Priority:** MEDIUM

**Deliverables:** Plugin Loader, Plugin Registry, Custom Parser API, Custom Export API
**Success Criteria:** Third-Party Extension Support
**Exit Condition:** ماژول خارجی بدون تغییر Core کار می‌کند.

---

## Phase 12 — Advanced / Backlog Features

**Priority:** LOW / OPTIONAL

**Deliverables:** هر آنچه در بخش Backlog اسناد 03، 07، 08 ثبت شده (GeoIP Inspector، Visual Topology، PDF Report، و...)
**Success Criteria:** Architecture Remains Stable
**Exit Condition:** بدون مهلت مشخص — بر اساس نیاز واقعی پروژه انتخاب می‌شوند.

---

## Release Gates (به‌روزرسانی‌شده)

| Gate | فازهای لازم |
|---|---|
| **Alpha** | Phase 1 → 5 (پایه + پارسرها + Worker) |
| **Beta** | Phase 1 → 8 (+ Analyzer Core + Converter + Storage) |
| **Release Candidate** | Phase 1 → 9 (+ UI کامل + Export) |
| **Stable** | Phase 1 → 10 (+ Analyzer Extended) |
| **Ultimate** | تمام فازها از جمله Plugin System و Backlog |

---

## Definition of Done (بدون تغییر)

- No Critical Bugs
- No Data Loss
- All Parsers Validated
- All Converters Verified
- All Exports Tested
- Documentation Complete
- Blueprints Complete

---

## Document Control

| Field | Value |
|---|---|
| نسخه | v2.3 |
| اصلاحات نسبت به v2.2 | (بازبینی نهایی) رفع ابهام «تناقض ظاهری» بین Parser-in-Phase-3 و Worker-in-Phase-5 — توضیح Sync-then-Wrap به Phase 3 و 5 اضافه شد |
| اصلاحات نسبت به v2.1 | (بازبینی اولویت ۱) ثبت یادداشت بررسی‌شده درباره‌ی ترتیب Phase 8 (Storage) — بدون تغییر فازبندی |
| سازگاری | این قانون با سند 14 (Dependency Policy) که Preact را فقط برای UI تأیید کرده، هم‌خوان است؛ تناقضی ایجاد نمی‌کند |
| تغییر در Vision | ندارد |
| سند بعدی | `10-BLUEPRINT_PERFORMANCE_ENGINE` |
