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
| Extraction/Inspection پیشرفته | GeoIP Inspector, ASN Inspector, Latency Tester *(مرزبندی Privacy/Network حل‌شده — ADR-024: فقط address+port، کلیک صریح، core/network/ جدا)* |
| Rule/Route Analysis | Rule Analyzer, Clash Rule Inspector, Sing-box Route Inspector |
| Builder Tools | Template Builder ✅ (P12-8), Subscription Builder ✅ (P12-9) |
| Visualization | Subscription Visualizer ✅ (P12-11, بدون Chart Library — ADR-026) *(بقیه‌ی چهار مورد حذف شدند — بند زیر)* |
| Extensibility | Custom Parser API / Custom Export API *(بررسی P12-13 — بند زیر)* |
| UX Scaling | Extractor Level System *(بررسی P12-12 — بند زیر؛ ۶ Extractor فعال از ۸-۱۰ آستانه‌ی پیشنهادی، به‌روز شده بعد از فعال‌شدن Worker/DNS Extractor)* |

### P12-11 — وضعیت گروه Visualization *(بررسی جدید — پیش از هر تحقیق Library)*

بررسی داده‌ی واقعی موجود در `core/types/unm.d.ts` و `core/analyzer/types.d.ts` برای هر ۵ فیچر،
قبل از هر تصمیم Library:

| # | فیچر | برچسب | دلیل |
|---|---|---|---|
| 1 | Node Relationship Map | ❌ **حذف کامل از Backlog** | هیچ فیلدی در UNM رابطه‌ی بین دو Node را ثبت نمی‌کند. تنها کاندید ضعیف، `MetadataObject.sourceFile?` است که بررسی مستقیم (`grep` روی هر ۶ `normalize.js`) نشان داد **هیچ‌کدام از Parserها هرگز آن را واقعاً پر نمی‌کنند** — یعنی حتی این داده‌ی ضعیف هم عملاً مرده است، نه یک سیگنال واقعی. این «فیلد کم داریم» نیست؛ خودِ مفهوم «این Node به آن یکی مرتبط است» در فرمت‌های Config موجود اصلاً استخراج‌پذیر نیست. |
| 2 | Cloudflare Topology View | ❌ **حذف کامل از Backlog** | `WorkerAnalysis` یک رکورد تخت تک‌نودی است (`workerDomain`, `pathSegments`, `uuidSegment`, `parameters`, `encodedDataFindings`) — چند مقدار Scalar برای **یک** Endpoint، نه یک شبکه‌ی چند-Hop. «Topology» یعنی یال بین چند موجودیت (Client→CDN→Origin)؛ UNM فقط یک Config پروکسی را مدل می‌کند، نه یک مسیر شبکه — چیزی جمع برای ترسیم Topology وجود ندارد. |
| 3 | Reality Visualizer | ❌ **حذف کامل از Backlog** | همان دلیل شماره ۲: `RealityAnalysis` فقط `applicable`/`compatible`/`pbkPlausible`/`sidPlausible`/`issues[]` برای یک Node است — از قبل کاملاً خوانا به‌صورت متن (بخش Reality Analysis در Analyzer Screen، جدول Reality Extractor). نموداری برای ۴ Boolean و یک لیست کوتاه، اطلاعاتی بیش از جدول موجود اضافه نمی‌کند. |
| 4 | Visual Topology Mapper | ❌ **حذف کامل از Backlog** | همان دلیل شماره ۱ — خودِ اسم فیچر فرض یک گراف اتصال بین Nodeها را دارد که وجود ندارد. |
| 5 | Subscription Visualizer | ✅ **قابل ساخت با داده‌ی موجود** | `SubscriptionSummary.protocolDistribution` (`core/analyzer/extended/subscription-analyzer.js`, Phase 10) داده‌ی واقعی، تجمیعی، چند-دسته‌ای روی **کل** مجموعه‌ی Node است — واقعاً شایسته‌ی نمودار، برخلاف ۴ مورد بالا که تک‌نودی و Scalar بودند. |

**تصمیم Library (مرحله ۳):** با فقط یک فیچر واقعی باقی‌مانده (نمودار میله‌ای حداکثر ۷ دسته —
تعداد پروتکل‌ها)، حتی مقایسه‌ی Bundle Size یک Chart Library هم نامتناسب بود. تصمیم: **بدون
کتابخانه** — `ui/subscription/chart.ts`'s `buildProtocolBars` یک تابع خالص ~۱۰ خطی است
(درصد عرض میله = `count / max * 100`)، رندر شده به‌صورت `<div>` ساده با درصد `width` — دقیقاً
همان الگویی که `ui/export/qr-render.ts` از قبل برای QR Code جا انداخته (SVG دستی، بدون
Dependency). جزئیات کامل در `docs/adr/ADR-026-VISUALIZATION-GROUP-NO-CHART-LIBRARY.md`.

### P12-12 — وضعیت Extractor Level System *(بررسی جدید)*

شمارش دقیق Extractorهای واقعی (`ui/extractor/extractor-screen.tsx`, doc 07 §4.5 — دقیقاً
همان‌هایی که این آیتم به آن‌ها اشاره دارد، نه Analyzerهای دیگر مثل GeoIP/Latency/Rule Analyzer که
در ردیف‌های بالای همین جدول، جدا دسته‌بندی شده‌اند):

| # | Extractor | وضعیت |
|---|---|---|
| 1 | UUID Extractor | ✅ فعال (Phase 9) |
| 2 | IP Extractor | ✅ فعال (Phase 9) |
| 3 | Domain Extractor | ✅ فعال (Phase 9) |
| 4 | Reality Extractor | ✅ فعال (Phase 9) |
| 5 | Worker Extractor | ⏸️ Placeholder (`aria-disabled`) — Worker Analyzer (`core/analyzer/extended/worker-analyzer.js`) از قبل ساخته و به AnalysisBundle وصل شده، ولی خودِ بخش Extractor Screen هنوز فعال نشده (Orphan Check جدا، خارج از Scope این بررسی) |
| 6 | DNS Extractor | ⏸️ Placeholder (`aria-disabled`) — `core/analyzer/extended/dns-analyzer.js` وجود دارد ولی حتی به AnalysisBundle (`analyze-node.js`) هم وصل نشده |

**عدد واقعی: ۴ Extractor کاملاً فعال، ۶ مورد در مجموع** (شامل ۲ Placeholder). هیچ Extractor
مجزای دیگری برای Password/SNI/Paths/Ports/Metadata عمومی (سند ۰۳ بخش ۳) هرگز ساخته نشده — این‌ها
فقط اسم در Spec قطعی هستند، نه پیاده‌سازی واقعی.

**آستانه‌ی پیشنهادی:** ۸ تا ۱۰ Extractor مجزا (معیاری که خودِ درخواست هم به آن اشاره کرد) — یعنی
حتی با فرض فعال‌شدن هر دو Placeholder، عدد به ۶ می‌رسد، هنوز به آستانه نرسیده.

**تصمیم: Blocked می‌ماند.** یادداشت مبهم قبلی («اگر تعداد Extractorها زیاد شد») با این عدد دقیق
جایگزین شد:

> این آیتم Blocked می‌ماند تا شمار Individual Extractorهای واقعی (فعال، نه Placeholder) به
> **۸ تا ۱۰** برسد. وضعیت فعلی: **۴ فعال از ۶ کل** — فاصله‌ی زیادی تا آستانه.

> **اصلاح (P12-13):** ردیف «Extensibility» قبلاً «Plugin System» را هم همراه با API فهرست می‌کرد.
> Plugin System خودش (Plugin Loader، Plugin Registry، Exporter Contract Checker) دیگر Backlog
> نیست — در Phase 11 با Spec کامل (ADR-020) ساخته و تست شده و از این ردیف حذف شد. آنچه باقی
> می‌ماند صرفاً **یک API عمومی/مستندشده‌ی سطح‌بالاتر** روی همان مکانیزم است — که طبق بررسی P12-13
> زیر، هنوز Blocked است.

> **اصلاح (بعد از این بررسی):** ردیف‌های ۵ (Worker Extractor) و ۶ (DNS Extractor) بالا، هر دو در
> چک‌پوینت‌های بعدی از Placeholder خارج و فعال شدند — Worker Extractor (Orphan Check جدا، بدون
> نیاز به منطق Core جدید) و DNS Extractor (`analyzeDnsLeakRisk` به `AnalysisBundle` وصل شد،
> ADR-022 Addendum). **عدد واقعی امروز: ۶ Extractor کاملاً فعال از ۶ کل** (`ui/extractor/
> extractor-screen.tsx` — هیچ `aria-disabled` باقی نمانده). آستانه‌ی ۸-۱۰ همچنان محقق نشده،
> پس تصمیم «Blocked می‌ماند» زیر عوض نمی‌شود — فقط فاصله تا آستانه کمتر شده (۲ Extractor، نه ۴).

### P12-13 — وضعیت Custom Parser/Export API *(بررسی جدید)*

بررسی صورت گرفت: از پایان Phase 11 تا امروز، **هیچ Plugin واقعی اضافه نشده**. تنها چیزی که در
`plugins/` وجود دارد `plugins/example-parser/index.js` است که در همان کامنت بالای فایلش صراحتاً
نوشته «EXAMPLE/TEST-ONLY, not production» و روی یک فرمت خیالی («UNCT-CSV») کار می‌کند که به گفته‌ی
خودش «در دنیای واقعی وجود ندارد — صرفاً نمایشی است». هیچ فراخوانی از `createPluginRegistry`/
`createPluginLoader` در `ui/main.tsx` یا هر صفحه‌ی دیگر وجود ندارد — یعنی حتی خودِ مکانیزم هم در
اپ واقعی هرگز اجرا نشده، فقط در تست واحد خودش.

**تصمیم: این آیتم Blocked می‌ماند** (نه Already-Complete) — نوشتن یک API عمومی روی مکانیزم Loader/
Registry موجود، بدون داشتن حداقل یک نمونه‌ی واقعی، حدس‌محور خواهد بود (همان ریسکی که یادداشت قبلی
هشدار داده بود). شرط دقیق رفع Block:

> این آیتم Blocked می‌ماند تا حداقل **دو Custom Parser واقعی** (نه لزوماً پروتکل‌های رسمی جدید —
> می‌تواند برای فرمت‌های Community/کمتر رایج باشد) یا **یک Custom Exporter واقعی** نوشته شود؛ فقط
> بعد از آن، الگوهای مشترک واقعی (نه فرضی) از آن پیاده‌سازی‌ها استخراج و به یک API عمومی/مستندشده
> تبدیل می‌شوند.

مکانیزم زیرین (`core/plugin/registry.js`, `core/plugin/loader.js`, `core/plugin/exporter-contract.js`)
همچنان کاملاً کاربردی و پابرجاست — این تصمیم فقط درباره‌ی «آیا الان زمان تبدیل آن به یک API عمومی/
مستند است» است، نه درباره‌ی خودِ مکانیزم.

> **اصلاح (بعد از این بررسی) — شرط سمت Parser محقق شد:** دو Custom Parser واقعی نوشته شد:
> `plugins/sip008-parser/` (سند رسمی SIP008 Shadowsocks JSON) و
> `plugins/hysteria2-config-parser/` (کانفیگ Native کلاینت Hysteria2). هر دو فرمت واقعاً غایب از
> `core/parser/` بودند (تأییدشده قبل از شروع)، هر دو با تست واحد واقعی (Fixture از Spec رسمی، نه
> فرضی) پوشش داده شدند، و هر دو با اسکرین‌شات واقعی Playwright از Converter Screen تأیید شدند —
> «Detected Format: sip008-parser» / «hysteria2-config-parser» واقعاً در UI نمایش داده شد، از
> طریق مکانیزم Worker واقعی (نه فقط تست واحد). یک لایه‌ی Fallback جدید و مجزا
> (`core/plugin/parse-with-plugins.js`) این دو Parser را بعد از شکست هر ۶ Parser هسته، هم در
> `core/parser/parse-and-validate.js` (Main Thread) و هم در `core/worker/parser.worker.js`
> (Worker واقعی) قابل‌دسترس می‌کند — بدون هیچ تغییری در خودِ زنجیره‌ی بسته‌ی شش‌تایی `factory.js`.
>
> **یافته‌ی معماری واقعی:** هر دو Parser مجبور شدند `sourceType: "subscription"` را بازاستفاده
> کنند، چون union منجمد `SourceType` هیچ مقدار اختصاصی برای «فایل کانفیگ Native، نه URI، نه پاکت
> JSON/YAML شش‌گانه‌ی موجود» برای هیچ پروتکلی به‌جز WireGuard ندارد (که خودش طبق ADR-007 یک مقدار
> اختصاصی گرفت). این محدودیت واقعی، نه فرضی، اکنون در `core/plugin/README.md` برای نویسندگان
> آینده مستند شده است.
>
> **تصمیم نهایی:** سمت Parser این آیتم دیگر Blocked نیست — `core/plugin/README.md` یک راهنمای
> واقعی و مستند برای نوشتن Custom Parser است، بر پایه‌ی دو نمونه‌ی واقعی، نه حدس. سمت Exporter
> (نیمه‌ی دیگر شرط بالا) **همچنان کاملاً باز و Blocked است** — `core/plugin/exporter-contract.js`
> هنوز هیچ پیاده‌سازی واقعی ندارد؛ جزئیات کامل در Addendum انتهای `ADR-020-PLUGIN-SYSTEM.md`.

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
| نسخه | v2.3 |
| اصلاحات نسبت به v2.2 | (ADR-024) به‌روزرسانی Backlog Latency Tester: مرزبندی Privacy/Network به‌صورت عمومی در سند ۰۱ و ADR-024 حل شد — نیازی به ADR جداگانه برای هر قابلیت آنلاین مشابه نیست |
| اصلاحات نسبت به v2.1 | (بازبینی نهایی) افزودن Hard Rule برای جلوگیری از Limbo Trap در دسته‌ی نیمه‌قطعی؛ افزودن دو سطح ADR (Lightweight/Full)؛ ثبت رسمی Gap شناخته‌شده‌ی Build & Bundling Strategy (متصل به Flag موجود در IMPLEMENTATION_BLUEPRINT) |
| 💭 یادآوری فرآیندی (خارج از محدوده‌ی محتوای بلوپرینت) | پیشنهاد شد نسخه‌ی این Index با Git Tag/Release Version پروژه همگام بماند (مثلاً همزمان با `v1.0.0-alpha`) — این یک Process Practice است، نه محتوای معماری؛ تصمیم اجرایی با مهدی |
| اصلاحات نسبت به v2.0 | (بر اساس بازبینی مهدی) افزودن گروه‌بندی «Governance & Quality»؛ افزودن «Architecture Freeze Scope» |
| نتیجه‌ی فرآیند | **بازبینی کامل ۱۹ بلوپرینت (فایل‌به‌فایل، دو دور) به پایان رسید.** پروژه از مرحله‌ی «پیش‌نویس» وارد مرحله‌ی **Architecture Baseline** شده است. |
| گام بعدی پیشنهادی | شروع فاز کدنویسی واقعی، طبق Phase 1 سند 09 (UNM + Validation Engine) — یا نوشتن ADR مشترک Build Step قبل از آن، در صورت تمایل |
