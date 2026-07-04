# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

> پروژه هر ۱۳ فاز Roadmap (`docs/blueprints/09-DEVELOPMENT_ROADMAP.md`) را — با چند استثنای صریح
> و مستند که آگاهانه Blocked/حذف شده‌اند (پایین‌تر) — پشت سر گذاشته، و **فاز نهایی: طراحی بصری**
> (هویت «Liquid Glass» طبق سند ۰۷ §۲، بازطراحی هر ۸ صفحه، CSS واکنش‌گرا، و Dark Mode واقعی) هم
> کامل شده — همان فازی که از ابتدای پروژه عمداً به انتها موکول شده بود. آنچه از آن فاز هنوز باقی
> مانده (ترجمه‌ی واقعی محتوای صفحات به فارسی + تأیید بصری RTL) در «محدودیت‌های شناخته‌شده» پایین‌تر
> صادقانه ذکر شده.

## وضعیت کلی

**Phase 0 تا Phase 12 کامل‌اند**، با این استثناهای مستند و آگاهانه (نه نقص، نه فراموشی):
- DNS Analyzer اکنون به `AnalysisBundle` وصل است و در Extractor Screen واقعی نمایش داده می‌شود
  (ADR-022 Addendum)؛ فقط تجمیع `dnsLeakRisk` در یک `riskScore` نهایی (Final Report، ترکیب
  Security+Compatibility+DNS+Reality) همچنان باز است — فرمولش هنوز تعریف نشده.
- Custom Parser/Export API عمومی (Phase 11) عمداً Blocked است تا حداقل دو Plugin واقعی نوشته شود.
- از گروه Visualization (Phase 12، ۵ فیچر)، ۴ تا به‌طور کامل از Backlog حذف شدند (داده‌ی واقعی
  ندارند)؛ فقط Subscription Visualizer ساخته شد.
- Extractor Level System (Phase 12) با عدد دقیق (۴ از ۶ Extractor فعال) همچنان Blocked است.

جزئیات دقیق هر فاز، هر ماژول، و هر محدودیت واقعی در ادامه — این بخش صادقانه نوشته شده،
نه خوش‌بینانه.

تست: **۱۱۱۲ تست در ۹۱ فایل** (Vitest)، همگی Pass؛ `tsc --noEmit` بدون خطا؛ `npm run build`
موفق (`app.js` ~۳۱۴kb، `parser-worker.js` ~۹۳kb، `converter-worker.js` ~۵۱kb)؛ `npm audit
--omit=dev` صفر آسیب‌پذیری.

---

## وضعیت هر فاز

| فاز | وضعیت | توضیح واقعی |
|---|---|---|
| Phase 0 — Architecture | ✅ کامل | ۱۹ سند Blueprint در `docs/blueprints/` |
| Phase 1 — Foundation Layer | ✅ کامل | UNM Immutable (`core/types/`, `core/unm/`)، Validation Engine Node-by-Node با Cross-Field (`core/validator/`)، Error Code Registry (`core/errors/`)، Testing Infrastructure (Vitest)، Foundation Acceptance Gate در سطح UNM/Validation و در سطح Raw-config (`tests/baseline-dataset/`) |
| Phase 2 — Parser Infrastructure | ✅ کامل | `BaseParser` Contract، `ParserFactory` با Confidence Scoring و زنجیره‌ی Fallback (`core/parser/factory.js`) |
| Phase 3 — Primary Parsers | ✅ کامل | Xray، URL، Subscription Parser |
| Phase 4 — Extended Parsers | ✅ کامل | Sing-box، Clash/Clash.Meta، WireGuard Parser — Foundation Gate سطح Raw-config با Pass Rate ۱۰۰٪ روی دیتاست ۱۰۰تایی |
| Phase 5 — Web Worker Engine | ✅ کامل | `worker-manager.js` (Pool، Cancellation، Versioning) + `parser.worker.js` + `analyzer.worker.js` + `converter.worker.js` واقعی‌اند و هر سه به Converter Screen وصل‌اند (Parse از طریق `parser.worker.js`، Convert از طریق `converter.worker.js`، هر دو با Fallback به Main Thread فقط زیر `file://`، طبق ADR-016). **استثنا:** Export Center مسیر جدایی دارد و مستقیماً `core/exporter/` را روی Main Thread صدا می‌زند، نه از طریق این Worker Pool (بخش محدودیت‌ها) |
| Phase 6 — Analyzer Engine (Core) | ✅ کامل | هر ۶ ماژول قطعی سند ۰۶: Completeness، Protocol، Network، TLS، Reality، Security Analyzer |
| Phase 7 — Converter Engine | ✅ کامل | UNM→URL، UNM→Xray JSON، UNM→Sing-box JSON، UNM→Clash YAML، Batch Conversion، `ConversionObject` |
| Phase 8 — Storage Layer | ✅ کامل | `core/storage/` (IndexedDB Adapter + Node Store + Template Store — بخش Phase 12) به UI وصل است: نودهای Parser State و Template Library هر دو Write-Through در پس‌زمینه Persist و با `hydrate()` روی mount بازخوانی می‌شوند — نودها/Templateها با Refresh/Restart مرورگر از بین نمی‌روند (تأییدشده با تست واقعی روی مرورگر). Theme در Settings هم جدا، از طریق `core/storage/local-adapter.js` Persist می‌شود |
| Phase 9 — UI Layer + Export Engine | ✅ کامل (با محدودیت‌های Scope مشخص) | هر ۸ صفحه‌ی اصلی سند ۰۷ ساخته و روی هویت بصری «Liquid Glass» بازطراحی شده؛ Export Engine کامل (جدول پایین). جزئیات هر صفحه پایین‌تر. معیار «Mobile Optimized» سند ۰۹ اکنون با CSS واکنش‌گرا (Media Query + Grid خودکار‌جمع‌شونده) پوشش داده شده — تأییدشده با Playwright روی چند صفحه؛ Dark Mode هم یک نسخه‌ی واقعی «Liquid Glass» تیره دارد (نه فقط رنگ تخت پشت المان‌های روشن) |
| Phase 10 — Analyzer Extended | ✅ کامل (با یک استثنای مستند) | هر ۷ ماژول ساخته شده‌اند؛ ۶ تا به `AnalysisBundle`/UI وصل‌اند، یکی (DNS) عمداً نه — جزئیات در بخش جدا پایین‌تر |
| Phase 11 — Plugin System | ✅ مکانیزم کامل / API عمومی Blocked | Loader/Registry/Exporter Contract (ADR-020) کامل و تست‌شده؛ Custom Parser/Export API عمومی Blocked با شرط دقیق — جزئیات پایین‌تر |
| Phase 12 — Advanced/Backlog | ✅ کامل (۳ Tier) | هر ۳ Tier بررسی/پیاده‌سازی شدند؛ چند آیتم آگاهانه Blocked/حذف شدند نه ساخته — جزئیات پایین‌تر |

---

## Phase 10 — Analyzer Extended: وضعیت هر ۷ ماژول

`core/analyzer/extended/` هفت ماژول دارد. شش‌تای اول از طریق `analyze-node.js` به
`AnalysisBundle` وصل و در UI مصرف می‌شوند (تأییدشده با grep مستقیم):

| ماژول | وضعیت | مصرف در UI |
|---|---|---|
| Compatibility Analyzer | ✅ کامل | Analyzer Screen — «Platform & Client Compatibility» |
| Cloudflare Analyzer | ✅ کامل | Analyzer Screen — «Cloudflare Analysis» |
| Clean IP Analyzer | ✅ کامل | Analyzer Screen — «Clean IP Analysis» |
| Worker Analyzer | ✅ کامل | Analyzer Screen — «Worker Analysis» + Extractor Screen — «Worker Extractor» |
| Rule Analyzer (P12-5) | ✅ کامل | Analyzer Screen — «Route Rules Analysis» |
| Subscription Analyzer | ✅ کامل (سطح-مجموعه، نه AnalysisBundle) | Subscription Center — Summary + Protocol Distribution (نمودار میله‌ای، P12-11) |
| **DNS Analyzer** | ✅ کامل، **به `AnalysisBundle` وصل** (فیلد مستقل `dns`، ADR-022 Addendum) | Extractor Screen — «DNS Extractor» (Badge رنگی برای none/low/medium/high/unknown). تجمیع در `riskScore` نهایی همچنان یک گام آینده (Final Report aggregation) است — طبق ADR-011، هرگز در `securityScore` ادغام نمی‌شود |

---

## Phase 11 — Plugin System: وضعیت واقعی

مکانیزم (`core/plugin/registry.js`, `loader.js`, `exporter-contract.js`، طبق ADR-020) **کامل
ساخته و تست شده** — Plugin Loader با Validation و Context ایزوله، Plugin Registry با دو
Namespace مجزا (Parser/Exporter). یک پلاگین نمونه (`plugins/example-parser/index.js`) وجود
دارد که در کامنت خودش صراحتاً «EXAMPLE/TEST-ONLY, not production» است — روی یک فرمت خیالی کار
می‌کند و در هیچ صفحه‌ی UI بارگذاری نمی‌شود.

**Custom Parser/Export API عمومی/مستندشده** (یک لایه‌ی سطح‌بالاتر روی همین مکانیزم) عمداً
Blocked است — بررسی مستقل (P12-13) نشان داد از پایان Phase 11 تا امروز هیچ Plugin واقعی نوشته
نشده، پس استخراج یک API عمومی حدس‌محور می‌بود. شرط دقیق رفع Block (مستند در
`ULTIMATE_BLUEPRINT_INDEX.md`): حداقل دو Custom Parser واقعی یا یک Custom Exporter واقعی.

---

## Phase 12 — Advanced/Backlog: خلاصه‌ی هر Tier

**Tier 1 (آنلاین اختیاری + تکمیلی):** GeoIP + ASN Inspector (ADR-025)، Latency Tester + Port
Availability Check (هر دو ADR-024، روی یک Probe مشترک `core/network/shared.js`)، DNS
Config-Level Extraction + DnsLeakRisk Analyzer (ADR-022، جدول بالا)، Performance Analyzer
(ADR-021 — Worker Pool Stats، در Developer Console)، PDF/Excel/Markdown Export (ADR-023)،
Portable Project Package (Export/Import کامل پروژه)، Rule Analyzer (جدول بالا).

**Tier 2 (Builder Tools):** Template Builder + Subscription Builder — Template دقیقاً یک
UNMNode است که در یک IndexedDB جدا (`core/storage/template-store.js`) برای استفاده‌ی مجدد
ذخیره می‌شود؛ Subscription Builder دقیقاً عکس Subscription Parser است (Round-Trip تأییدشده).
هر دو در Subscription Center.

**Tier 3 (بررسی صادقانه‌ی Backlog قدیمی، قبل از هر کد جدید):**
- Custom Parser/Export API → Blocked (بالا).
- Extractor Level System → شمارش دقیق نشان داد فقط ۴ از ۶ Extractor فعال‌اند (آستانه‌ی
  پیشنهادی ۸-۱۰) — Blocked با عدد دقیق، نه حدس.
- گروه Visualization (۵ فیچر) → ۴ تا (Node Relationship Map، Visual Topology Mapper،
  Cloudflare Topology View، Reality Visualizer) **به‌طور کامل حذف شدند**، چون هیچ داده‌ی
  واقعی چندموجودیتی/رابطه‌ای در UNM برایشان وجود ندارد (نه یک فیلد کم است، بلکه خودِ مفهوم
  رابطه/توپولوژی در معماری فعلی بی‌معناست). فقط Subscription Visualizer با داده‌ی واقعی
  (Protocol Distribution) ساخته شد — بدون هیچ Chart Library (ADR-026؛ نمودار میله‌ای دستی با
  `<div>`، مثل الگوی SVG دستی `qr-render.ts`).

جزئیات کامل هر بررسی در `docs/blueprints/ULTIMATE_BLUEPRINT_INDEX.md` (بخش‌های P12-11،
P12-12، P12-13).

---

## ۸ صفحه‌ی اصلی (Main Screens)

| # | صفحه | وضعیت واقعی |
|---|---|---|
| 1 | **Dashboard** (صفحه‌ی پیش‌فرض) | Quick Stats، Node Summary، Health Overview، Warnings، «Recent Imports» همگی واقعی. «Recent Exports» همچنان Placeholder غیرفعال — هیچ ماژولی هنوز Log فعالیت Export را ثبت نمی‌کند |
| 2 | **Converter** | Paste Area + **File Upload + Drag-Drop Zone + Clipboard Import — هر سه واقعی و کامل** (تست Unit + E2E). Parse و Convert هر دو از طریق Worker واقعی انجام می‌شوند (Fallback به Main Thread فقط زیر `file://`، ADR-016) |
| 3 | **Analyzer** | همه‌ی بخش‌ها واقعی: Node Details، Protocol، Security+TLS، Compatibility/Network، Reality، Cloudflare، Clean IP، Worker، Route Rules |
| 4 | **Subscription Center** | Search/Filter/Sort/Group + Summary (Protocol Distribution با نمودار میله‌ای، Duplicate/Invalid Nodes، Security Ranking) + GeoIP/ASN Lookup + Latency Test + Port Availability Check + Template Library + Subscription Builder — همگی واقعی. Tag، Merge، Split، Deduplicate همچنان Deferred. بدون Virtual List (عمداً، تا داده‌ی واقعی ۱۰,۰۰۰+ نودی موجود شود) |
| 5 | **Extractor** | هر ۶ Extractor واقعی و فعال: UUID/IP/Domain/Reality/Worker/**DNS**. هیچ Placeholder غیرفعالی باقی نمانده |
| 6 | **Export Center** | کامل‌ترین صفحه: TXT، Xray JSON، Sing-box JSON، Normalized JSON، Analysis JSON، Clash YAML، CSV، PDF، Excel، Markdown، ZIP (+ manifest.json)، QR، HTML Report (Escape + DOMPurify، ADR-018)، Portable Project Package (Export/Import کامل پروژه)، Clipboard Quick Copy — همگی واقعی |
| 7 | **Settings** | فقط **Theme Engine** (Dark/Light/Auto با همگام‌سازی زنده با OS، ظاهر Radio Card بازطراحی‌شده) + انتخاب زبان (بدون ترجمه‌ی محتوای صفحات — زیرساخت i18n آماده، محتوا هنوز ترجمه نشده) |
| 8 | **Developer Console** | ۶ از ۷ بخش سند ۰۷ §۴.۷ واقعی (Parser/Warnings/Errors/Recovery/Validation Logs + **Performance Logs**، از طریق `usePerformanceState()`/ADR-021). فقط نیمه‌ی «Alternative Candidates» (از Detection Logs) Placeholder غیرفعال است — هیچ ماژولی رتبه‌بندی گذرای Parserهای رقیب را نگه نمی‌دارد |

---

## نحوه‌ی اجرا — کاربر نهایی (بدون نصب هیچ‌چیز)

۱. در صفحه‌ی ریپو (`operaboys/UNCT`) روی دکمه‌ی سبز **Code** بزنید → **Download ZIP**.
   ⚠️ **حتماً قبل از این کار، برانچ بالای لیست فایل‌ها را روی `claude/unct-phase-1-foundation-flrbrr`
   بگذارید — نه `main`.**
۲. فایل ZIP را Extract کنید.
۳. داخل پوشه‌ی Extract‌شده، مستقیماً روی **`index.html`** بزنید (بدون اجرای هیچ دستوری، بدون نصب).

برنامه باید بلافاصله باز و کامل قابل‌استفاده باشد — هر ۸ صفحه از طریق نوار بالای صفحه در دسترس‌اند.

---

## برای توسعه‌دهنده

```
npm install              # نصب ابزار توسعه (اپ خودش Zero-Build/استاتیک می‌ماند)
npm test                  # اجرای کل تست‌ها (Vitest)
npm run test:watch
npm run test:coverage
npm run typecheck         # بررسی تایپ بدون خروجی (tsc --noEmit)
npm run build             # بازساخت assets/js/app.js، assets/js/parser-worker.js، assets/js/converter-worker.js
npm run test:e2e          # تست واقعی مرورگر (Playwright) — قبلش npm run build را خودش صدا می‌زند
```

> بعد از هر تغییر در `ui/` یا `core/worker/*.worker.js`، حتماً `npm run build` را اجرا و
> خروجی (`assets/js/app.js*`, `assets/js/parser-worker.js*`, `assets/js/converter-worker.js*`)
> را در همان Commit وارد کنید — این خروجی Commit می‌شود، نه Gitignore (بخش بعدی).

### قبل از هر کد: بخوان

به ترتیب این فایل‌ها را در `docs/blueprints/` بخوان:

1. `01-MASTER_BLUEPRINT.md`
2. `ANTI_CHAOS_BLUEPRINT.md`
3. `MASTER_FILE_STRUCTURE.md`
4. `05-UNIVERSAL_NODE_MODEL.md`
5. `04-PARSER_ENGINE.md`
6. `09-DEVELOPMENT_ROADMAP.md`
7. `15-TESTING_FRAMEWORK.md`
8. `ULTIMATE_BLUEPRINT_INDEX.md` — فهرست زنده‌ی هر تصمیم Backlog/Blocked با دلیل دقیق

بقیه‌ی اسناد هم برای Context کلی موجودند؛ تصمیم‌های معماری مهم در `docs/adr/ADR-001` تا
`ADR-026` ثبت شده‌اند.

### وضعیت npm audit (فقط Dev)

`npm audit` کل پروژه ۶ آسیب‌پذیری نشان می‌دهد (۳ Moderate، ۱ High، ۲ Critical) — همگی از یک
زنجیره‌ی واحد: `esbuild <=0.24.2` ← `vite` ← `vitest`/`@vitest/coverage-v8`. `npm audit fix`
(بدون `--force`) چیزی را Resolve نمی‌کند (تست‌شده، بدون تغییر در `package-lock.json`)؛ تنها
راه‌حل موجود `npm audit fix --force` است که `vitest@4.1.9` نصب می‌کند (Breaking Change) — فعلاً
عمداً اجرا نشده تا زیرساخت تست (سند ۱۵) بدون بررسی کامل Migration نشکند.

این آسیب‌پذیری‌ها منحصراً در زنجیره‌ی Dev/Build Tooling هستند، نه در محصول نهایی: «
`npm audit --omit=dev` صفر آسیب‌پذیری نشان می‌دهد» (تأییدشده) — یعنی Dependencyهای واقعی که به
کاربر نهایی می‌رسند (`preact`, `dompurify`, `fflate`, `js-yaml`, `uqr`, `write-excel-file`) امن‌اند.

### تست E2E با Playwright (فقط Dev)

`@playwright/test` (و `@types/node` برای تایپ ماژول‌های Node داخل `tests/e2e/`) به‌عنوان
Dependency صرفاً Dev اضافه شده — طبق همان رویه‌ای که برای `npm audit` بالا استفاده شد: ابزار
Dev-only با یک یادداشت کوتاه در README، نه یک ADR کامل. اپ نهایی (`assets/js/`) به آن وابسته
نیست. `tests/e2e/*.spec.js` عمداً خارج از `vitest.config.js`'s include است؛ فقط با
`npm run test:e2e` (که اول `npm run build` را اجرا می‌کند) با Playwright اجرا می‌شود.

---

## تصمیم Build Step

تنش معماری بین «Single HTML Output / No Build Step» و نیازهای واقعی پروژه با
`docs/adr/ADR-014-BUILD-STEP-SCOPED-TO-UI-AND-ASSEMBLY.md` حل شد: یک Build Step محدود (esbuild)
فقط برای `ui/` و Assembly نهایی مجاز است؛ `core/` همچنان Zero-Build و JS+JSDoc خام می‌ماند
(ADR-005). `npm run build` خروجی را در `assets/js/app.js`، `assets/js/parser-worker.js`، و
`assets/js/converter-worker.js` می‌سازد.

این خروجی‌ها Gitignore نیستند — Commit می‌شوند (هنوز هرگز دستی ویرایش نمی‌شوند — فقط
`npm run build` آن‌ها را می‌سازد)، چون هدف Offline-First پروژه (Deployment Mode 1) یعنی
Clone/Download ZIP بدون اجرای هیچ دستوری باید کار کند. جزئیات کامل در Addendum انتهای `ADR-014`
و `ADR-016`.

---

## محدودیت‌های شناخته‌شده (Known Limitations)

این بخش صادقانه است — هرچیزی که در عمل ساخته نشده یا کامل وصل نیست، اینجاست:

- **`riskScore` نهایی (Final Report aggregation) هنوز تعریف نشده** — `dnsLeakRisk` اکنون یک
  فیلد مستقل در `AnalysisBundle`/Extractor Screen است (ADR-022 Addendum)، ولی ترکیب
  Security+Compatibility+DNS+Reality در یک عدد نهایی `riskScore` طبق ADR-011 بند «Explicitly
  out of scope» همچنان یک ADR جدا و آینده است — نه این فاز.
- **Custom Parser/Export API عمومی Blocked است** — مکانیزم Plugin System (Loader/Registry)
  کامل کار می‌کند؛ فقط یک لایه‌ی API عمومی/مستندشده‌ی سطح‌بالاتر ساخته نشده، چون هیچ Plugin
  واقعی (غیر از یک نمونه‌ی صریحاً Test-Only) برای استخراج الگوی مشترک واقعی وجود ندارد.
- **Extractor Level System (Basic/Advanced/Deep) Blocked است** — فقط ۴ از ۶ Extractor واقعی
  فعال‌اند (آستانه‌ی پیشنهادی ۸-۱۰)؛ عدد دقیق در `ULTIMATE_BLUEPRINT_INDEX.md` بخش P12-12.
- **۴ از ۵ فیچر گروه Visualization به‌طور کامل حذف شدند** (Node Relationship Map، Visual
  Topology Mapper، Cloudflare Topology View، Reality Visualizer) — نه Blocked، بلکه حذف کامل،
  چون هیچ داده‌ی چندموجودیتی/رابطه‌ای واقعی در UNM برایشان وجود ندارد. جزئیات در
  `docs/adr/ADR-026-VISUALIZATION-GROUP-NO-CHART-LIBRARY.md`.
- **`core/worker/converter.worker.js` به Converter Screen وصل است، ولی نه به Export Center** —
  Export Center (`ui/export/export-screen.tsx`) مستقیماً `core/exporter/` را روی Main Thread
  صدا می‌زند؛ یک تصمیم Scope جداست، نه باگ.
- **محتوای صفحات هنوز به فارسی ترجمه نشده** — زیرساخت i18n (`core/i18n/`، ADR-019) کامل و
  تست‌شده است و `languageChoice`/`resolvedLanguage` در Settings واقعاً کار می‌کند (`lang`/`dir`
  سند در `<html>` واقعاً عوض می‌شود)، ولی متن ثابت هر ۸ صفحه هنوز مستقیماً انگلیسی است — به
  Dictionary وصل نشده. تأیید بصری واقعی RTL (یعنی دیدن صفحات زیر `dir="rtl"` با محتوای واقعی
  فارسی) هم به همین دلیل هنوز انجام نشده؛ تنها تضمین فعلی، رعایت CSS Logical Properties در سرتاسر
  `assets/css/theme.css` (طبق `docs/architecture/RTL-GUIDELINES.md`) است که باید mirroring را
  بدون تغییر ساختاری فراهم کند، نه تأیید چشمی با متن فارسی واقعی.
- **هویت بصری «Liquid Glass» (سند ۰۷ §۲) کامل است** — هر ۸ صفحه بازطراحی شدند: `.glass-panel`/
  `.signal-ring`/`.protocol-badge` + مجموعه‌ای از کلاس‌های عمومی مشترک (`.panel-grid`،
  `.data-table`، `.kv-list`، `.tag`، `.btn`، `.select`، …) که هر صفحه از همان مجموعه بازاستفاده
  می‌کند، نه بازتعریف محلی. CSS واکنش‌گرا (Grid خودکارجمع‌شونده + یک Media Query برای چیدمان
  نامتقارن Dashboard/Converter) و یک Dark Mode واقعی (شفافیت/Highlight/Glint با پالت تیره‌ی
  مجزا، نه صرفاً پس‌زمینه‌ی تیره پشت المان‌های روشن) هر دو با Playwright تأیید شده‌اند — Dark Mode
  مستقیماً روی ۶ از ۸ صفحه (Dashboard، Converter، Analyzer، Subscription Center، Export Center،
  Developer Console) Screenshot گرفته شد؛ Settings و Extractor از همان کلاس‌های مشترک استفاده
  می‌کنند پس باید همان‌طور درست باشند، ولی به‌صورت مجزا دوباره Screenshot نگرفته شدند.
- **پیش‌نمایش گزارش HTML در Export Center، در Dark Mode کنتراست پایینی دارد** —
  `core/exporter/to-html.js` یک سند HTML کاملاً مستقل با استایل داخلی ثابت (برای دانلود/اشتراک‌گذاری
  خارج از اپ) می‌سازد که عمداً به `data-theme` زنده‌ی اپ وابسته نیست؛ داخل iframe در Dark Mode
  همان استایل روشن ثابت را دارد که روی پس‌زمینه‌ی تیره‌ی iframe کم‌کنتراست دیده می‌شود. رفع آن یک
  تغییر در خودِ `core/exporter/to-html.js` (افزودن `background:#fff` صریح به سند تولیدی) است، نه
  یک مسئله‌ی `theme.css`.
- **`core/normalizer/` و `core/detector/` از ساختار حذف شدند** — یک نتیجه‌ی معماری، نه محدودیت:
  منطق Detect/Normalize داخل خود هر Parser و `core/unm/mapper/` پیاده شده.
- **«Recent Exports» (Dashboard) و «Alternative Candidates» (Developer Console)** همچنان
  Placeholder غیرفعال‌اند — هیچ ماژولی این داده را ثبت نمی‌کند (Rule 9: عدم جعل داده).
- **Drag-Drop Zone فقط Unit Test دارد، نه E2E** — تصمیم آگاهانه: شبیه‌سازی یک Drag واقعی از
  خارج صفحه در هیچ ابزار خودکارسازی مرورگری ممکن نیست؛ جزئیات کامل در کامنت پایانی
  `tests/e2e/file-upload.spec.js`.

---

## گام بعدی واقعی

فاز نهایی طراحی بصری (هویت «Liquid Glass»، بازطراحی هر ۸ صفحه، CSS واکنش‌گرا، Dark Mode واقعی)
کامل شد. آنچه از آن فاز صادقانه هنوز باقی مانده (بخش «محدودیت‌های شناخته‌شده» بالا):

1. **ترجمه‌ی واقعی محتوای صفحات به فارسی** — زیرساخت i18n آماده است، فقط متن‌ها به Dictionary
   وصل نشده‌اند.
2. **تأیید بصری واقعی RTL** با محتوای فارسی واقعی زیر `dir="rtl"` (تا امروز فقط رعایت CSS
   Logical Properties تضمین شده، نه یک بررسی چشمی).
3. یک اصلاح کوچک در `core/exporter/to-html.js` برای کنتراست پیش‌نمایش گزارش HTML در Dark Mode.

هیچ‌کدام Blocker معماری ندارند؛ هر سه آماده‌ی شروع مستقیم‌اند.
