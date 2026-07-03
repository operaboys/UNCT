# BLUEPRINT 03 — FEATURE MATRIX

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — محتوای فاز‌بندی شده (بدون تغییر در Vision) |
| **وابسته به** | 01-MASTER_BLUEPRINT, 02-SYSTEM_ARCHITECTURE |

> ⚠️ **تغییر نسبت به نسخه‌ی اصلی:** بخش «Future Modules» از حالت فهرست یکجا خارج و به یک بخش مجزای **Backlog** در انتهای سند منتقل شد تا با Spec قطعی فعلی قاطی نشود. هیچ فیچری حذف نشده، فقط اولویت‌بندی شفاف شده.

---

## 1. Analyzer Module (Spec قطعی)

- Protocol Detection
- Network Detection
- TLS Detection
- Reality Detection
- ALPN Detection
- Fingerprint Detection
- SNI Detection
- Path Detection
- Host Detection
- Risk Scoring

### Analyzer Module — نیمه‌قطعی (فاز بعدی)

- Cloudflare Detection
- Worker Detection
- Clean IP Detection
- DNS Detection

> این چهار مورد به زیرساخت پیچیده‌تری (استخراج از Base64/Worker Payload) نیاز دارند و بعد از تکمیل Analyzer پایه پیاده‌سازی می‌شوند.

---

## 2. Subscription Center (Spec قطعی)

### 2.1 Subscription Validation *(جدید — پیشنهاد بازبینی)*

> باید **قبل از** Merge/Split اجرا شود، نه بعد از آن.

- Validate Subscription
- Detect Empty Subscription
- Detect Broken Base64
- Detect Duplicate Payload

### 2.2 عملیات اصلی

- Decode Base64
- Merge Subscription
- Split Subscription
- Deduplicate Nodes
- Sort Nodes
- Filter Nodes
- Search Nodes
- Tag Nodes
- Export Nodes

---

## 3. Advanced Extraction (Spec قطعی)

- Extract UUID
- Extract Password
- Extract Domains
- Extract IPs
- Extract SNI
- Extract Paths
- Extract Ports
- **Extract Metadata** *(جدید — Extractor عمومی برای Fingerprint/ALPN/Flow/PBK/SID؛ جای ساخت یک Extractor مجزا برای هر فیلد جدید را می‌گیرد)*

### Advanced Extraction — نیمه‌قطعی

- Extract Clean IPs
- Extract Workers
- Extract Reality Keys

---

## 4. Batch Operations (Spec قطعی)

- Batch Convert
- Batch Analyze
- Batch Export
- Batch Import
- Batch Rename
- Batch Normalize

---

## 5. Developer Console (Spec قطعی)

- Parser Logs
- Warning Logs
- Validation Logs
- Conversion Logs
- Debug Inspector
- Raw Object Viewer
- **Performance Monitor** *(جدید)* — Worker Count, Queue Size, Processing Time, Memory Usage

---

## 6. Backlog (Idea — بدون Commitment زمانی)

> این بخش صرفاً برای ثبت ایده‌هاست تا فراموش نشوند. هیچ‌کدام Spec ندارند و قبل از پیاده‌سازی باید بلوپرینت مجزا و دقیق برایشان نوشته شود (مطابق Rule 7 سند ANTI_CHAOS: «هر قابلیت جدید باید در Blueprint ثبت شود»).

- GeoIP Inspector
- ASN Inspector
- Latency Tester
- Rule Analyzer
- Clash Rule Inspector
- Sing-box Route Inspector
- Template Builder
- Subscription Builder
- Visual Topology Mapper
- **Extractor Level System** *(جدید — بازبینی نهایی)*: تفکیک رسمی Extractorها به سطح Basic/Advanced/Deep با امکان انتخاب توسط کاربر — فعلاً بدون نیاز واقعی، چون «Extract Metadata» (بخش ۳) و Individual Extractorها روی فیلدهای متفاوتی کار می‌کنند و تداخلی ندارند. اگر تعداد Extractorها در آینده زیاد شد، این ایده بررسی می‌شود.
- **Plugin Extensions / Future Plugins** *(اصلاح‌شده — پیشنهاد بازبینی)*
- **Custom Parser API / Custom Export API (عمومی/مستندشده)** *(بازبینی P12-13 — بند زیر)*

> ⚠️ **رفع تناقض:** نسخه‌ی قبلی این سند، «Plugin System» را در Backlog قرار داده بود، در حالی که در `09-DEVELOPMENT_ROADMAP` (Phase 11) به‌عنوان یک فاز رسمی با Spec وجود دارد — این دو با هم در تناقض بودند. اصلاح: **هسته‌ی Plugin System** (Plugin Loader, Plugin Registry, Exporter Contract Checker) دیگر Backlog نیست و در Phase 11 با ADR-020 ساخته و تست شده. آنچه واقعاً Backlog و بدون Spec است، **پلاگین‌های واقعی آینده** (مثلاً یک پلاگین خاص برای یک پروتکل جدید) است که اینجا ثبت شده.

> ⚠️ **اصلاح روی اصلاح (P12-13 — تصحیح ادعای نسخه‌ی قبلی):** جمله‌ی بالا («Custom Parser/Export API دیگر Backlog نیست») ادعایی بیش از واقعیت بود — مکانیزم زیرین (Loader/Registry) ساخته شده، ولی هیچ **API عمومی/مستندشده‌ای** روی آن استخراج نشده، چون از پایان Phase 11 تا امروز **هیچ Plugin واقعی نوشته نشده** (تنها نمونه، `plugins/example-parser/`, صراحتاً «EXAMPLE/TEST-ONLY, not production» است و روی یک فرمت خیالی کار می‌کند؛ هیچ صفحه‌ای در `ui/` حتی خودِ Loader/Registry را صدا نمی‌زند). بنابراین این دو مورد از فهرست «دیگر Backlog نیست» جدا و دوباره Blocked اعلام می‌شوند — با شرط دقیق (نه ابهام): تا نوشته‌شدن حداقل دو Custom Parser واقعی (فرمت‌های Community/کمتر رایج هم قابل‌قبول‌اند) یا یک Custom Exporter واقعی، که تنها بعد از آن الگوهای واقعی (نه فرضی) به یک API عمومی تبدیل می‌شوند. جزئیات کامل در `ULTIMATE_BLUEPRINT_INDEX` بخش «P12-13».

---

## 7. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (P12-13) تصحیح ادعای نسخه‌ی v1.1 درباره‌ی Custom Parser/Export API: مکانیزم زیرین (Loader/Registry) ساخته شده، اما API عمومی هنوز Blocked است تا حداقل دو Plugin واقعی نوشته شود — Template Builder/Subscription Builder به «تکمیل‌شده» علامت خوردند (P12-8/P12-9) |
| اصلاحات نسبت به v1.2 | (بازبینی نهایی) افزودن ایده‌ی Extractor Level System به Backlog — بدون تداخل واقعی با ساختار فعلی، فقط برای آینده ثبت شد |
| اصلاحات نسبت به v1.1 | (بر اساس بازبینی مهدی) افزودن Subscription Validation، Extract Metadata، Performance Monitor؛ رفع تناقض Plugin System بین این سند و Roadmap |
| سند بعدی | `04-BLUEPRINT_PARSER_ENGINE` |
