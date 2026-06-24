# ULTIMATE BLUEPRINT INDEX v2.0

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — کوچک‌سازی و هماهنگی با واقعیت پروژه |
| **Version** | 2.0 |

> ⚠️ **چرا این سند بازنویسی شد:** نسخه‌ی اصلی به ۴۰+ سند با اسم مستقل اشاره می‌کرد که اکثرشان هرگز نوشته نشدند و صرفاً «اسم» بودند — این می‌توانست گمراه‌کننده باشد (به نظر می‌رسید پروژه ۴۰ بلوپرینت دارد، در حالی که فقط ۱۹ فایل واقعی وجود دارد). این نسخه، اسناد را به سه دسته‌ی واقعی تقسیم می‌کند: **موجود**، **برنامه‌ریزی‌شده برای آینده‌ی نزدیک**، و **ایده (Backlog)** — هم‌راستا با مدل سه‌سطحی که برای کل پروژه تعریف شد.

---

## دسته ۱ — اسناد موجود (۱۹ فایل واقعی)

### Vision & Architecture
| سند | فایل |
|---|---|
| Master Blueprint | `01-MASTER_BLUEPRINT` |
| System Architecture | `02-SYSTEM_ARCHITECTURE` |
| Feature Matrix | `03-FEATURE_MATRIX` |
| File Structure | `MASTER_FILE_STRUCTURE` |

### Governance & Quality *(جدید — پیشنهاد بازبینی)*

> این سه سند از نظر معماری به یک خانواده تعلق دارند — هر سه «قانون و کیفیت» را تعریف می‌کنند، نه «رفتار سیستم».

| سند | فایل |
|---|---|
| Anti-Chaos Rules | `ANTI_CHAOS_BLUEPRINT` |
| Testing Framework | `15-TESTING_FRAMEWORK` |
| Dependency Policy | `14-DEPENDENCY_POLICY` |

### Core Engine
| سند | فایل |
|---|---|
| Parser Engine | `04-PARSER_ENGINE` |
| Universal Node Model | `05-UNIVERSAL_NODE_MODEL` |
| Analyzer Engine | `06-ANALYZER_ENGINE` |
| Export Engine | `08-EXPORT_ENGINE` |
| Parser Factory | `12-PARSER_FACTORY` |

### UI & Performance
| سند | فایل |
|---|---|
| UI/UX System | `07-UI_UX_SYSTEM` |
| Performance Engine | `10-PERFORMANCE_ENGINE` |
| State Management *(Deprecated → Merged)* | `11-STATE_MANAGEMENT` |
| Render Engine *(Deprecated → Merged)* | `13-RENDER_ENGINE` |

### Development & Deployment
| سند | فایل |
|---|---|
| Development Roadmap | `09-DEVELOPMENT_ROADMAP` |
| Implementation Blueprint | `IMPLEMENTATION_BLUEPRINT` |
| این سند | `ULTIMATE_BLUEPRINT_INDEX` |

---

## دسته ۲ — نیمه‌قطعی (Spec ناقص، بعد از Core اضافه می‌شود)

این موارد در دل اسناد موجود به‌عنوان زیربخش "نیمه‌قطعی" مشخص شده‌اند (نه اسناد جدا):

- Analyzer Engine — Extended Modules (Cloudflare/Worker/DNS/Subscription/Compatibility) → داخل سند 06
- Future Exports (PDF, Excel, Markdown) → داخل سند 08
- Future UI Modules (Visual Graph, Topology View) → داخل سند 07
- Performance Analyzer → اسم برده شده در سند 06، ولی هنوز بدون Spec — **باید قبل از پیاده‌سازی، یک بلوپرینت مجزا برایش نوشته شود**

### Hard Rule — جلوگیری از «Limbo Trap» *(جدید — بازبینی نهایی)*

> ⚠️ **ریسک واقعی:** دسته‌ی «نیمه‌قطعی» می‌تواند یک تله‌ی مدیریتی باشد — نه به‌اندازه‌ی کافی Spec دارد که بشود کدش را زد، نه به‌اندازه‌ی کافی فراموش‌شده که Backlog باشد. وسوسه‌ی واقعی این است که توسعه‌دهنده بگوید «۸۰٪ مشخصه، بقیه‌اش را حین کار می‌فهمم» و بعداً همان ۲۰٪ ناقص، معماری را خراب کند.

**قانون مطلق:** هیچ کدی از موارد دسته‌ی ۲ نوشته نمی‌شود مگر این‌که Spec آن کامل شود و طی یک ADR رسماً به دسته‌ی ۱ (موجود) ارتقا پیدا کند. تا قبل از آن، در عمل همان حکم Backlog را دارد — نه بیشتر، نه کمتر.

---

## دسته ۳ — Backlog (ایده، بدون سند، بدون Commitment)

> طبق Rule 07 سند ANTI_CHAOS («هر قابلیت جدید باید در Blueprint ثبت شود»)، این موارد فقط *ثبت* شده‌اند تا فراموش نشوند؛ هیچ‌کدام تا نوشتن یک Spec دقیق، وارد فاز کدنویسی نمی‌شوند.

| دسته | موارد |
|---|---|
| Extraction/Inspection پیشرفته | GeoIP Inspector, ASN Inspector, Latency Tester |
| Rule/Route Analysis | Rule Analyzer, Clash Rule Inspector, Sing-box Route Inspector |
| Builder Tools | Template Builder, Subscription Builder |
| Visualization | Visual Topology Mapper, Node Relationship Map, Subscription Visualizer, Cloudflare Topology View, Reality Visualizer |
| Extensibility | Plugin System, Custom Parser API, Custom Export API |

---

## نکته‌ی صادقانه درباره‌ی نسخه‌ی اصلی این سند

نسخه‌ی قبلی، ساختاری ۱۰ سطحی (Level 1 تا Level 10) با اسم‌هایی مثل `PRODUCT_VISION`، `EVENT_FLOW_MAP`، `SECURITY_BLUEPRINT`، `CODING_STANDARDS` و غیره فهرست می‌کرد که **هیچ‌کدام به‌صورت فایل واقعی وجود نداشتند**. این الگو با اصل «هر قابلیت باید در Blueprint ثبت شود» (که مستلزم وجود واقعی سند است، نه فقط اسم) همخوانی نداشت. به همین دلیل این فهرست حذف و با فهرست واقعی بالا جایگزین شد.

---

## Architecture Freeze Scope *(جدید — پیشنهاد بازبینی)*

> با پایان این دور بازبینی کامل (۱۹ فایل، فایل‌به‌فایل)، حوزه‌های زیر **Architecture-Stable** اعلام می‌شوند:

**The Following Areas Are Considered Architecture-Stable:**

- UNM (سند 05)
- Parser Philosophy (سند 04)
- Parser Factory (سند 12)
- Anti-Chaos Rules (سند ANTI_CHAOS)
- Worker-Based Processing Model (سند 10)
- Testing Framework Structure (سند 15)

> **Changes To These Areas Require Architecture Review** (طبق Rule 13 سند ANTI_CHAOS — نیاز به ADR، ثبت در `docs/adr/` طبق سند MASTER_FILE_STRUCTURE).
>
> این فریز به معنای «غیرقابل تغییر برای همیشه» نیست — به معنای «هر تغییر باید عمدی، مستند، و آگاهانه باشد»، نه یک Refactor بی‌دلیل وسط کدنویسی.

### دو سطح ADR *(جدید — بازبینی نهایی)*

> ⚠️ **گلوگاه واقعی:** اگر فرآیند ADR برای **هر** تغییر (حتی افزودن یک فیلد اختیاری به Metadata) به همان اندازه سنگین باشد، توسعه‌دهنده‌ها برای تغییرات کوچک آن را دور می‌زنند (Workaround) و این خودش Technical Debt تولید می‌کند.

| سطح | برای چه تغییراتی | فرآیند |
|---|---|---|
| **Lightweight ADR** | تغییرات جزئی و Additive (مثل افزودن یک فیلد اختیاری جدید به `metadata`, یک Enum جدید) | فقط یک فایل کوتاه در `docs/adr/` + یک خط در Commit Message؛ بدون نیاز به بررسی رسمی |
| **Full ADR** | تغییرات ساختاری (مثل تغییر الگوریتم `ParserFactory`, تغییر Worker Pool Architecture، یا هرچه در «Architecture Freeze Scope» بالا ثبت شده) | بررسی کامل، ثبت Context/Decision/Consequences، طبق فرمت استاندارد ADR |

### Gap شناخته‌شده — Build & Bundling Strategy *(جدید — بازبینی نهایی)*

> 🔗 این Gap با Flag باز موجود در سند `IMPLEMENTATION_BLUEPRINT` (تنش Single-HTML/No-Build-Step + htm/TypeScript) یکی است، نه یک مشکل جدا. وقتی آن ADR مشترک نوشته شد، خروجی آن باید به‌صورت یک سند یا بخش رسمی (مثلاً `BUILD_PIPELINE_SPEC` یا یک بخش بزرگ در `IMPLEMENTATION_BLUEPRINT`) ثبت شود — مشخص‌کننده‌ی Bundler انتخابی (در صورت وجود)، نحوه‌ی Inline کردن Workerها (چون Single HTML نمی‌تواند فایل Worker جدا Load کند)، و Minify/Inject شدن CSS/JS. **این سند هنوز نوشته نشده و نباید قبل از آن ADR نوشته شود.**

---

## Document Control

| Field | Value |
|---|---|
| نسخه | v2.2 |
| اصلاحات نسبت به v2.1 | (بازبینی نهایی) افزودن Hard Rule برای جلوگیری از Limbo Trap در دسته‌ی نیمه‌قطعی؛ افزودن دو سطح ADR (Lightweight/Full)؛ ثبت رسمی Gap شناخته‌شده‌ی Build & Bundling Strategy (متصل به Flag موجود در IMPLEMENTATION_BLUEPRINT) |
| 💭 یادآوری فرآیندی (خارج از محدوده‌ی محتوای بلوپرینت) | پیشنهاد شد نسخه‌ی این Index با Git Tag/Release Version پروژه همگام بماند (مثلاً همزمان با `v1.0.0-alpha`) — این یک Process Practice است، نه محتوای معماری؛ تصمیم اجرایی با مهدی |
| اصلاحات نسبت به v2.0 | (بر اساس بازبینی مهدی) افزودن گروه‌بندی «Governance & Quality»؛ افزودن «Architecture Freeze Scope» |
| نتیجه‌ی فرآیند | **بازبینی کامل ۱۹ بلوپرینت (فایل‌به‌فایل، دو دور) به پایان رسید.** پروژه از مرحله‌ی «پیش‌نویس» وارد مرحله‌ی **Architecture Baseline** شده است. |
| گام بعدی پیشنهادی | شروع فاز کدنویسی واقعی، طبق Phase 1 سند 09 (UNM + Validation Engine) — یا نوشتن ADR مشترک Build Step قبل از آن، در صورت تمایل |
