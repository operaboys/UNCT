# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

> پروژه هر ۱۳ فاز Roadmap (`docs/blueprints/09-DEVELOPMENT_ROADMAP.md`) را — با چند استثنای صریح
> و مستند که آگاهانه Blocked/حذف شده‌اند (پایین‌تر) — پشت سر گذاشته. **فاز نهایی: طراحی بصری**
> (هویت «Liquid Glass» طبق سند ۰۷ §۲، بازطراحی هر ۸ صفحه، CSS واکنش‌گرا، Dark Mode واقعی) کامل
> شده، **و** بعد از آن، ترجمه‌ی واقعی فارسی + تأیید بصری RTL هر ۸ صفحه هم کامل شد (`core/i18n/`،
> ۲۹۹ کلید دیکشنری در هر دو زبان، `tests/e2e/rtl-visual.spec.js` با ۱۳ تست Pass). چند فیکس
> کنتراست/Responsive واقعی هم بعد از آن پیدا و رفع شدند (پایین‌تر). آنچه واقعاً هنوز باز است —
> `riskScore` نهایی، Custom Parser/Export API، Extractor Level System — در «محدودیت‌های
> شناخته‌شده» پایین‌تر صادقانه ذکر شده.

## وضعیت کلی

**Phase 0 تا Phase 12 کامل‌اند**، با این استثناهای مستند و آگاهانه (نه نقص، نه فراموشی):
- `riskScore` نهایی (تجمیع Security+Compatibility+DNS+Reality در Final Report) هنوز تعریف
  نشده — طبق ADR-011، یک ADR جدا و آینده است.
- Custom Parser/Export API عمومی (Phase 11) عمداً Blocked است تا حداقل دو Plugin واقعی نوشته شود.
- از گروه Visualization (Phase 12، ۵ فیچر)، ۴ تا به‌طور کامل از Backlog حذف شدند (داده‌ی واقعی
  ندارند)؛ فقط Subscription Visualizer ساخته شد.
- Extractor Level System (Phase 12) همچنان Blocked است — هر ۶ Extractor واقعی حالا فعال‌اند
  (بند پایین)، ولی آستانه‌ی پیشنهادی ۸-۱۰ Extractor هنوز محقق نشده.

جزئیات دقیق هر فاز، هر ماژول، و هر محدودیت واقعی در ادامه — این بخش صادقانه نوشته شده،
نه خوش‌بینانه.

تست: **۱۱۱۲ تست در ۹۱ فایل** (Vitest)، همگی Pass؛ `tsc --noEmit` بدون خطا؛ `npm run build`
موفق (`app.js` ~۳۱۴kb، `parser-worker.js` ~۹۳kb، `converter-worker.js` ~۵۱kb)؛ `npm audit
--omit=dev` صفر آسیب‌پذیری. (هر عدد بالا با اجرای واقعی `npm test`/`npm run typecheck`/
`npm run build`/`npm audit` در همین چک‌پوینت دوباره تأیید شد، نه از حافظه.)

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
| Phase 8 — Storage Layer | ✅ کامل | `core/storage/` (IndexedDB Adapter + Node Store + Template Store — بخش Phase 12) به UI وصل است: نودهای Parser State و Template Library هر دو Write-Through در پس‌زمینه Persist و با `hydrate()` روی mount بازخوانی می‌شوند — نودها/Templateها با Refresh/Restart مرورگر از بین نمی‌روند (تأییدشده با تست واقعی روی مرورگر). Theme/Language در Settings هم جدا، از طریق `core/storage/local-adapter.js` Persist می‌شوند |
| Phase 9 — UI Layer + Export Engine | ✅ کامل (با محدودیت‌های Scope مشخص) | هر ۸ صفحه‌ی اصلی سند ۰۷ ساخته، روی هویت بصری «Liquid Glass» بازطراحی، و کامل به فارسی ترجمه شده (i18n + RTL، بند پایین). Export Engine کامل (جدول پایین). جزئیات هر صفحه پایین‌تر. معیار «Mobile Optimized» سند ۰۹ با CSS واکنش‌گرا (Media Query + Grid خودکار‌جمع‌شونده) پوشش داده شده و با چند فیکس واقعی Responsive بعد از بازطراحی تکمیل شد (بند «محدودیت‌های شناخته‌شده» پایین برای فهرست دقیق)؛ Dark Mode هم یک نسخه‌ی واقعی «Liquid Glass» تیره دارد که روی هر ۸ صفحه جداگانه Screenshot گرفته و تأیید شده |
| Phase 10 — Analyzer Extended | ✅ کامل | هر ۷ ماژول ساخته شده و به `AnalysisBundle`/UI وصل‌اند (جدول پایین) |
| Phase 11 — Plugin System | ✅ مکانیزم کامل / API عمومی Blocked | Loader/Registry/Exporter Contract (ADR-020) کامل و تست‌شده؛ Custom Parser/Export API عمومی Blocked با شرط دقیق — جزئیات پایین‌تر |
| Phase 12 — Advanced/Backlog | ✅ کامل (۳ Tier) | هر ۳ Tier بررسی/پیاده‌سازی شدند؛ چند آیتم آگاهانه Blocked/حذف شدند نه ساخته — جزئیات پایین‌تر |

---

## Phase 10 — Analyzer Extended: وضعیت هر ۷ ماژول

`core/analyzer/extended/` هفت ماژول دارد. هر هفت‌تا از طریق `analyze-node.js` به
`AnalysisBundle` وصل و در UI مصرف می‌شوند (تأییدشده با grep مستقیم):

| ماژول | وضعیت | مصرف در UI |
|---|---|---|
| Compatibility Analyzer | ✅ کامل | Analyzer Screen — «Platform & Client Compatibility» |
| Cloudflare Analyzer | ✅ کامل | Analyzer Screen — «Cloudflare Analysis» |
| Clean IP Analyzer | ✅ کامل | Analyzer Screen — «Clean IP Analysis» |
| Worker Analyzer | ✅ کامل | Analyzer Screen — «Worker Analysis» + Extractor Screen — «Worker Extractor» |
| Rule Analyzer (P12-5) | ✅ کامل | Analyzer Screen — «Route Rules Analysis» |
| Subscription Analyzer | ✅ کامل (سطح-مجموعه، نه AnalysisBundle) | Subscription Center — Summary + Protocol Distribution (نمودار میله‌ای، P12-11) |
| DNS Analyzer | ✅ کامل، به `AnalysisBundle` وصل (فیلد مستقل `dns`، ADR-022 Addendum) | Extractor Screen — «DNS Extractor» (Badge رنگی برای none/low/medium/high/unknown). تجمیع در `riskScore` نهایی همچنان یک گام آینده است — طبق ADR-011، هرگز در `securityScore` ادغام نمی‌شود |

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
- Extractor Level System → هر ۶ Extractor واقعی (`ui/extractor/extractor-screen.tsx`) حالا
  فعال‌اند (UUID/IP/Domain/Reality/Worker/DNS، هیچ `aria-disabled` باقی نمانده)، ولی آستانه‌ی
  پیشنهادی ۸-۱۰ Extractor مجزا هنوز محقق نشده — Blocked با عدد دقیق، نه حدس.
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

هر ۸ صفحه روی هویت «Liquid Glass» بازطراحی و کامل به فارسی ترجمه شده‌اند (`t()`/
`createTranslator`، شامل نوار ناوبری بالای صفحه). وضعیت واقعی هر صفحه:

| # | صفحه | وضعیت واقعی |
|---|---|---|
| 1 | **Dashboard** (صفحه‌ی پیش‌فرض) | Quick Stats، Node Summary، Health Overview، Warnings، «Recent Imports» همگی واقعی. «Recent Exports» همچنان Placeholder غیرفعال — هیچ ماژولی هنوز Log فعالیت Export را ثبت نمی‌کند |
| 2 | **Converter** | Paste Area + File Upload + Drag-Drop Zone + Clipboard Import — هر سه واقعی و کامل (تست Unit + E2E). Parse و Convert هر دو از طریق Worker واقعی انجام می‌شوند (Fallback به Main Thread فقط زیر `file://`، ADR-016) |
| 3 | **Analyzer** | همه‌ی بخش‌ها واقعی: Node Details، Protocol، Security+TLS، Compatibility/Network، Reality، Cloudflare، Clean IP، Worker، Route Rules |
| 4 | **Subscription Center** | Search/Filter/Sort/Group + Summary (Protocol Distribution با نمودار میله‌ای، Duplicate/Invalid Nodes، Security Ranking) + GeoIP/ASN Lookup + Latency Test + Port Availability Check + Template Library + Subscription Builder — همگی واقعی. Tag، Merge، Split، Deduplicate همچنان Deferred. بدون Virtual List (عمداً، تا داده‌ی واقعی ۱۰,۰۰۰+ نودی موجود شود) |
| 5 | **Extractor** | هر ۶ Extractor واقعی و فعال: UUID/IP/Domain/Reality/Worker/DNS. هیچ Placeholder غیرفعالی باقی نمانده |
| 6 | **Export Center** | کامل‌ترین صفحه: TXT، Xray JSON، Sing-box JSON، Normalized JSON، Analysis JSON، Clash YAML، CSV، PDF، Excel، Markdown، ZIP (+ manifest.json)، QR، HTML Report (Escape + DOMPurify، ADR-018)، Portable Project Package (Export/Import کامل پروژه)، Clipboard Quick Copy — همگی واقعی |
| 7 | **Settings** | **Theme Engine** (Dark/Light/Auto با همگام‌سازی زنده با OS) **و Language Engine** (English/فارسی/Auto با سوییچ زنده‌ی `dir`/`lang` روی `<html>`، بدون Reload) — هر دو با Radio Card یکسان بازطراحی‌شده، هر دو Persist می‌شوند (`core/storage/local-adapter.js`) |
| 8 | **Developer Console** | ۶ از ۷ بخش سند ۰۷ §۴.۷ واقعی (Parser/Warnings/Errors/Recovery/Validation Logs + Performance Logs، از طریق `usePerformanceState()`/ADR-021). فقط نیمه‌ی «Alternative Candidates» (از Detection Logs) Placeholder غیرفعال است — هیچ ماژولی رتبه‌بندی گذرای Parserهای رقیب را نگه نمی‌دارد |

---

## i18n + RTL — وضعیت واقعی

`core/i18n/` (ADR-019) کامل و به هر ۸ صفحه + نوار ناوبری (`ui/components/nav.tsx`) وصل است:

- دو دیکشنری (`core/i18n/dictionaries/en.js`, `fa.js`) با **۲۹۹ کلید در هر دو زبان** (شمارش
  واقعی با `Object.keys`، نه تخمین) — `tests/i18n/dictionaries.test.js` عدم‌تطابق کلید بین دو
  زبان و رشته‌ی خالی را رد می‌کند.
- تمام متن هر ۸ صفحه (نه فقط برچسب‌ها) از طریق `t()`/`createTranslator` resolve می‌شود؛ نوار
  ناوبری هم از `labelKey`/`t()` استفاده می‌کند، نه رشته‌ی ثابت انگلیسی.
- Settings' Language Engine (`languageChoice`/`resolvedLanguage`) واقعاً `dir`/`lang` سند
  `<html>` را زنده عوض می‌کند — بدون Reload، بدون localStorage دستی برای تست.
- دیکشنری از رشته‌های Dev-facing (ارجاع مستقیم به شماره‌ی سند/بند/ADR که قرار نبود کاربر
  ببیند) پاکسازی شد — تأییدشده در commit `c604b42`.
- تأیید بصری واقعی RTL: `tests/e2e/rtl-visual.spec.js` — **۱۳ تست Pass** — شامل `dir="rtl"`/
  `lang="fa"` روی `<html>`، متن فارسی واقعی (نه بازگشت خاموش به انگلیسی) روی هر ۸ صفحه بدون
  خطای Console، Mirror شدن واقعی `.content-grid`/`.panel-grid`/`.data-table` زیر RTL، و
  Mirror شدن جهت آیکون فلش (`.cta-arrow`، یک باگ واقعی که همین بررسی پیدا و رفع کرد).
- `tests/e2e/language-switcher.spec.js`: سوییچ زبان از طریق کلیک واقعی روی Radio Card (نه
  تزریق دستی `localStorage`) را تأیید می‌کند.

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

> **قانون دائمی (از این چک‌پوینت به بعد): هر Commit/چک‌پوینت باید `README.md` را هم‌زمان
> به‌روز نگه دارد** — نه فقط بخش مرتبط با همان تسک، بلکه هر بخش دیگری که همان تغییر
> نادرست/عقب‌افتاده کرده باشد (جدول فازها، جدول ۸ صفحه، محدودیت‌های شناخته‌شده، اعداد
> تست/build). این یک قدم اختیاری یا «اگر وقت شد» نیست؛ بخشی ثابت از هر Commit است. هر عدد
> گزارش‌شده (شمار تست، حجم build، شمار کلید دیکشنری، …) باید بلافاصله پیش از نوشتن با یک
> دستور واقعی (`npm test`، `grep`، `Object.keys`، …) تأیید شود، حتی اگر «از چک‌پوینت قبل
> درست به‌نظر برسد».

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
- **Extractor Level System (Basic/Advanced/Deep) Blocked است** — هر ۶ Extractor واقعی فعال‌اند
  (بند بالا)، ولی آستانه‌ی پیشنهادی ۸-۱۰ Extractor مجزا هنوز محقق نشده؛ جزئیات در
  `ULTIMATE_BLUEPRINT_INDEX.md` بخش P12-12.
- **۴ از ۵ فیچر گروه Visualization به‌طور کامل حذف شدند** (Node Relationship Map، Visual
  Topology Mapper، Cloudflare Topology View، Reality Visualizer) — نه Blocked، بلکه حذف کامل،
  چون هیچ داده‌ی چندموجودیتی/رابطه‌ای واقعی در UNM برایشان وجود ندارد. جزئیات در
  `docs/adr/ADR-026-VISUALIZATION-GROUP-NO-CHART-LIBRARY.md`.
- **`core/worker/converter.worker.js` به Converter Screen وصل است، ولی نه به Export Center** —
  Export Center (`ui/export/export-screen.tsx`) مستقیماً `core/exporter/` را روی Main Thread
  صدا می‌زند؛ یک تصمیم Scope جداست، نه باگ.
- **`core/normalizer/` و `core/detector/` از ساختار حذف شدند** — یک نتیجه‌ی معماری، نه محدودیت:
  منطق Detect/Normalize داخل خود هر Parser و `core/unm/mapper/` پیاده شده.
- **«Recent Exports» (Dashboard) و «Alternative Candidates» (Developer Console)** همچنان
  Placeholder غیرفعال‌اند — هیچ ماژولی این داده را ثبت نمی‌کند (Rule 9: عدم جعل داده).
- **Drag-Drop Zone فقط Unit Test دارد، نه E2E** — تصمیم آگاهانه: شبیه‌سازی یک Drag واقعی از
  خارج صفحه در هیچ ابزار خودکارسازی مرورگری ممکن نیست؛ جزئیات کامل در کامنت پایانی
  `tests/e2e/file-upload.spec.js`.

---

## اصلاحات اخیر پس از پایان فاز طراحی بصری (برای ردیابی، نه یک محدودیت)

فاز طراحی بصری/i18n که «کامل» اعلام شده بود، چند باگ واقعی داشت که در بازبینی‌های بعدی پیدا و
رفع شدند — برای شفافیت کامل، همه‌شان با فایل/commit مشخص اینجا ثبت می‌شوند (نه صرفاً حذف از
لیست محدودیت‌ها):

- **کنتراست پایین «neutral glass surface»** — `.action-btn.secondary`، `.btn--ghost`، `.input`،
  `.select`، `.code-textarea`، `.radio-card` همگی در Light و Dark Mode تقریباً هم‌رنگ
  `.glass-panel` زیرشان بودند (بدون Border). رفع شد با افزایش Opacity پس‌زمینه + یک Border
  ظریف `--unct-purple` روی هر ۶ کلاس، در هر دو تم (`assets/css/theme.css`، commit‌های
  `2e382df` و `656bf42`).
- **پیش‌نمایش گزارش HTML در Dark Mode کنتراست پایین داشت** — `core/exporter/to-html.js` یک
  `background:#fff` صریح گرفت (commit `b131749`).
- **سه باگ واقعی Mobile/Responsive**: Overflow کردن `<select>` فرمت در Export Center (فقدان
  `min-width: 0` روی یک Flex Item)، اندازه‌ی پیکسلی مطلق SVG کد QR (بدون قید به عرض کارت)، و
  نبود Breakpoint موبایل روی `.stat-row` داشبورد — هر سه در `assets/css/theme.css` رفع شدند
  (commit `dfc7e2f`).
- **کارت QR در دسکتاپ با تعداد نود کم، در گوشه‌ی چپ گیر می‌افتاد** — علت `grid-template-columns:
  repeat(auto-fill, …)` در `.qr-grid` بود (ستون‌های خالی شبح، دقیقاً همان مشکلی که `.panel-grid`
  از قبل با `auto-fit` حل کرده بود)؛ رفع شد با تغییر به `auto-fit` + یک `max-width: 240px` روی
  خودِ `.qr-card` (commit `f8fb1e6`).

---

## گام بعدی واقعی

فاز نهایی طراحی بصری و فاز i18n/RTL هر دو کامل شدند. آنچه از کل پروژه صادقانه هنوز باز است
(بخش «محدودیت‌های شناخته‌شده» بالا، نه یک فاز جدید):

1. **`riskScore` نهایی (Final Report aggregation)** — نیاز به یک ADR جدا برای فرمول ترکیب
   Security+Compatibility+DNS+Reality دارد؛ هیچ ماژولی مالک این تجمیع نیست.
2. **Custom Parser/Export API عمومی** — Blocked تا حداقل دو Plugin واقعی (یا یک Exporter واقعی)
   نوشته شود؛ مکانیزم زیرین از قبل کامل و تست‌شده است.
3. **Extractor Level System (Basic/Advanced/Deep)** — Blocked تا شمار Extractorهای واقعی از ۶
   به آستانه‌ی پیشنهادی ۸-۱۰ برسد.

هیچ‌کدام Blocker معماری ندارند؛ هر سه صرفاً منتظر یک محرک بیرونی (تصمیم فرمول، یا حجم واقعی
Plugin/Extractor بیشتر) هستند، نه کدنویسی ناتمام.
