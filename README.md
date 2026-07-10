# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

> پروژه هر ۱۳ فاز Roadmap (`docs/blueprints/09-DEVELOPMENT_ROADMAP.md`) را — با چند استثنای صریح
> و مستند که آگاهانه Blocked/حذف شده‌اند (پایین‌تر) — پشت سر گذاشته. **فاز نهایی: طراحی بصری**
> (هویت «Liquid Glass» طبق سند ۰۷ §۲، بازطراحی هر ۸ صفحه، CSS واکنش‌گرا، Dark Mode واقعی) کامل
> شده، **و** بعد از آن، ترجمه‌ی واقعی فارسی + تأیید بصری RTL هر ۸ صفحه هم کامل شد (`core/i18n/`،
> ۲۹۹ کلید دیکشنری در هر دو زبان، `tests/e2e/rtl-visual.spec.js` با ۱۳ تست Pass). چند فیکس
> کنتراست/Responsive واقعی هم بعد از آن پیدا و رفع شدند (پایین‌تر). سپس Custom Parser API
> (Phase 11) هم با دو Parser واقعی (SIP008، Hysteria2 Native Config)، و Custom Exporter API هم
> با یک Exporter واقعی (SIP008 Exporter، عکس دقیق همان Parser) تا حد یک API مستندشده‌ی کامل
> پیش رفت — Custom Parser/Export API دیگر Blocked نیست. Extractor Level System (Phase 12) هم
> با ۴ Extractor واقعی جدید (Credentials/Transport/TLS Fingerprint/Flow) به آستانه‌ی ۱۰ از ۱۰
> رسید. در آخرین چک‌پوینت، **`riskScore` نهایی هم با یک ADR رسمی (ADR-027) و پیاده‌سازی واقعی
> رفع شد** — `compatibilityScore` (پیش‌نیازش) و `riskScore` هر دو فرمول‌بندی، پیاده، تست، و به
> Analyzer Screen وصل شدند. **این آخرین مورد باز شناخته‌شده‌ی کل پروژه بود — دیگر هیچ مورد باز
> شناخته‌شده‌ای در سطح معماری (doc06 §3 / Phase 6-12) باقی نمانده.**

## وضعیت کلی

**Phase 0 تا Phase 12 کامل‌اند.** آخرین مورد باز پروژه (`riskScore` نهایی) هم در همین چک‌پوینت
رفع شد — جزئیات زیر مستند و آگاهانه‌اند (نه نقص، نه فراموشی):
- `riskScore` و `compatibilityScore` (پیش‌نیازش) هر دو فرمول‌بندی و پیاده‌سازی شدند (ADR-027) —
  جزئیات کامل در بند پایین. **این آخرین Flag باز معماری کل پروژه بود.**
- Custom Parser/Export API عمومی (Phase 11) دیگر Blocked نیست — دو Custom Parser واقعی
  (SIP008، Hysteria2 Native Config) و یک Custom Exporter واقعی (SIP008 Exporter) نوشته شد،
  هر دو با `core/plugin/README.md` مستند (بند پایین).
- از گروه Visualization (Phase 12، ۵ فیچر)، ۴ تا به‌طور کامل از Backlog حذف شدند (داده‌ی واقعی
  ندارند)؛ فقط Subscription Visualizer ساخته شد.
- Extractor Level System (Phase 12) دیگر Blocked نیست — ۴ Extractor واقعی جدید
  (Credentials/Transport/TLS Fingerprint/Flow) اضافه شد، عدد نهایی ۱۰ Extractor فعال از ۱۰ کل،
  دقیقاً رسیده به آستانه‌ی پیشنهادی ۸-۱۰ (بند پایین).

جزئیات دقیق هر فاز، هر ماژول، و هر محدودیت واقعی در ادامه — این بخش صادقانه نوشته شده،
نه خوش‌بینانه.

تست: **۱۱۸۱ تست در ۹۶ فایل** (Vitest)، همگی Pass؛ `tsc --noEmit` بدون خطا؛ `npm run build`
موفق (`app.js` ~۳۲۹kb، `parser-worker.js` ~۱۰۰kb، `converter-worker.js` ~۵۱kb)؛ `npm audit
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
| Phase 6 — Analyzer Engine (Core) | ✅ کامل | هر ۶ ماژول قطعی سند ۰۶: Completeness، Protocol، Network، TLS، Reality، Security Analyzer؛ `compatibilityScore`/`riskScore` (سند ۰۶ §۳.۱، ADR-027) هم فرمول‌بندی و پیاده شدند |
| Phase 7 — Converter Engine | ✅ کامل | UNM→URL، UNM→Xray JSON، UNM→Sing-box JSON، UNM→Clash YAML، Batch Conversion، `ConversionObject` |
| Phase 8 — Storage Layer | ✅ کامل | `core/storage/` (IndexedDB Adapter + Node Store + Template Store — بخش Phase 12) به UI وصل است: نودهای Parser State و Template Library هر دو Write-Through در پس‌زمینه Persist و با `hydrate()` روی mount بازخوانی می‌شوند — نودها/Templateها با Refresh/Restart مرورگر از بین نمی‌روند (تأییدشده با تست واقعی روی مرورگر). Theme/Language در Settings هم جدا، از طریق `core/storage/local-adapter.js` Persist می‌شوند |
| Phase 9 — UI Layer + Export Engine | ✅ کامل (با محدودیت‌های Scope مشخص) | هر ۸ صفحه‌ی اصلی سند ۰۷ ساخته، روی هویت بصری «Liquid Glass» بازطراحی، و کامل به فارسی ترجمه شده (i18n + RTL، بند پایین). Export Engine کامل (جدول پایین). جزئیات هر صفحه پایین‌تر. معیار «Mobile Optimized» سند ۰۹ با CSS واکنش‌گرا (Media Query + Grid خودکار‌جمع‌شونده) پوشش داده شده و با چند فیکس واقعی Responsive بعد از بازطراحی تکمیل شد (بند «محدودیت‌های شناخته‌شده» پایین برای فهرست دقیق)؛ Dark Mode هم یک نسخه‌ی واقعی «Liquid Glass» تیره دارد که روی هر ۸ صفحه جداگانه Screenshot گرفته و تأیید شده |
| Phase 10 — Analyzer Extended | ✅ کامل | هر ۷ ماژول ساخته شده و به `AnalysisBundle`/UI وصل‌اند (جدول پایین) |
| Phase 11 — Plugin System | ✅ کامل — Parser API و Exporter API هر دو مستند و رفع Block | Loader/Registry/Exporter Contract (ADR-020) کامل و تست‌شده؛ دو Custom Parser واقعی (SIP008، Hysteria2 Native Config) + یک Custom Exporter واقعی (SIP008 Exporter) نوشته شد؛ راهنمای نویسنده (`core/plugin/README.md`) هر دو نوع Plugin را مستند می‌کند — جزئیات پایین‌تر |
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
| DNS Analyzer | ✅ کامل، به `AnalysisBundle` وصل (فیلد مستقل `dns`، ADR-022 Addendum) | Extractor Screen — «DNS Extractor» (Badge رنگی برای none/low/medium/high/unknown). تجمیع در `riskScore` نهایی اکنون واقعی و پیاده‌شده است (ADR-027) — هرگز در `securityScore` ادغام نمی‌شود، طبق ADR-011 |
| Risk Score / Compatibility Score | ✅ کامل (ADR-027، آخرین Flag باز پروژه) | Analyzer Screen — «Risk Score» زیر Security Analysis، «Compatibility Score» بالای جدول Platform & Client Compatibility |

---

## Phase 11 — Plugin System: وضعیت واقعی

مکانیزم (`core/plugin/registry.js`, `loader.js`, `exporter-contract.js`، طبق ADR-020) **کامل
ساخته و تست شده** — Plugin Loader با Validation و Context ایزوله، Plugin Registry با دو
Namespace مجزا (Parser/Exporter). یک پلاگین نمونه (`plugins/example-parser/index.js`) وجود
دارد که در کامنت خودش صراحتاً «EXAMPLE/TEST-ONLY, not production» است — روی یک فرمت خیالی کار
می‌کند، در `core/plugin/app-plugins.js` عمداً بارگذاری نمی‌شود، و در هیچ صفحه‌ی UI هم نیست.

**شرط Custom Parser (رفع‌شده):** طبق شرط دقیق P12-13 («حداقل دو Custom Parser واقعی یا یک
Custom Exporter واقعی»)، دو Custom Parser واقعی نوشته شد — `plugins/sip008-parser/` (فرمت
رسمی SIP008 شادوساکس، چند-گرهی) و `plugins/hysteria2-config-parser/` (فایل Config بومی
کلاینت Hysteria2، تک-گرهی) — هرکدام BaseParser Contract را کامل پیاده می‌کنند، با
`createPluginLoader`/`createPluginRegistry` ثبت شده‌اند (نه مستقیم `core/parser/factory.js`)،
و تست واحد واقعی دارند. یک لایه‌ی Fallback جدید (`core/plugin/parse-with-plugins.js`) این دو
را به هر دو مسیر واقعی Parse (`core/parser/parse-and-validate.js` و
`core/worker/parser.worker.js`) وصل کرده — فقط وقتی همه‌ی ۶ Parser هسته شکست بخورند امتحان
می‌شوند؛ زنجیره‌ی بسته‌ی `ParserFactory` دست‌نخورده ماند. با تأیید واقعی Playwright روی
Converter Screen (هر دو فرمت با متن صحیح «Detected Format» نمایش داده شدند)، الگوی مشترک
استخراج و در `core/plugin/README.md` مستند شد — راهنمای واقعی برای نویسندگان Custom Parser
شخص ثالث.

**شرط Custom Exporter (رفع‌شده):** نیمه‌ی دوم شرط P12-13 هم برآورده شد — `plugins/sip008-
exporter/` عکس دقیق `sip008-parser` است: `UNMNode[]` را به همان سند رسمی JSON شادوساکس
برمی‌گرداند، فقط نودهای `protocol: "shadowsocks"` را نمایش می‌دهد و بقیه را با `reason` واضح
Skip می‌کند (Rule 9)، از طریق `createPluginLoader`/`createPluginRegistry` در `core/plugin/app-
plugins.js` ثبت شده (نه مستقیم `core/exporter/`)، و تست واحد واقعی دارد شامل یک تست Round-Trip
واقعی (خروجی آن دوباره از `sip008-parser` عبور داده می‌شود و همان نودها را بازتولید می‌کند).
`ui/export/export-screen.tsx` این Plugin را از طریق `appPluginRegistry.getExporter(...)` به یک
گزینه‌ی واقعی در Export Center وصل می‌کند — با اسکرین‌شات واقعی Playwright (Light+Dark) تأیید
شد. **Custom Parser/Export API دیگر Blocked نیست.** جزئیات کامل در
`docs/adr/ADR-020-PLUGIN-SYSTEM.md` (Addendum) و `ULTIMATE_BLUEPRINT_INDEX.md` (P12-13).

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
- Custom Parser/Export API → ✅ **رفع Block کامل** — دو Custom Parser واقعی + یک Custom
  Exporter واقعی، هر دو با `core/plugin/README.md` مستند (بالا).
- Extractor Level System → ✅ **رفع Block** — ۴ Extractor واقعی جدید (Credentials/Transport/
  TLS Fingerprint/Flow) اضافه شد؛ ۱۰ Extractor کاملاً فعال از ۱۰ کل
  (`ui/extractor/extractor-screen.tsx`)، رسیده به آستانه‌ی پیشنهادی ۸-۱۰.
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
| 1 | **Dashboard** (صفحه‌ی پیش‌فرض) | Quick Stats، Node Summary، Health Overview، Warnings، «Recent Imports»، «Recent Exports» همگی واقعی. «Recent Exports» از `core/store/recent-exports-state.js` (LocalStorage، مستقل از parserStore/analyzerStore) می‌خواند؛ هر ۴ عملیات دانلود در Export Center بعد از موفقیت واقعی یک ورودی به آن اضافه می‌کنند |
| 2 | **Converter** | Paste Area + File Upload + Drag-Drop Zone + Clipboard Import — هر سه واقعی و کامل (تست Unit + E2E). Parse و Convert هر دو از طریق Worker واقعی انجام می‌شوند (Fallback به Main Thread فقط زیر `file://`، ADR-016) |
| 3 | **Analyzer** | همه‌ی بخش‌ها واقعی: Node Details، Protocol، Security+TLS، Compatibility/Network، Reality، Cloudflare، Clean IP، Worker، Route Rules |
| 4 | **Subscription Center** | Search/Filter/Sort/Group + Summary (Protocol Distribution با نمودار میله‌ای، Duplicate/Invalid Nodes، Security Ranking) + GeoIP/ASN Lookup + Latency Test + Port Availability Check + Template Library + Subscription Builder + **Deduplicate Nodes** + **Split Subscription** + **Tag Nodes** + **Merge Subscription** (Textarea + «Import & Merge»، همان Pipeline واقعی `parseRawConfig`، با `parserStore.addNode` اضافه می‌کند نه جایگزین) — همگی واقعی، هیچ Placeholder یا Deferred باقی نمانده. **Node List اکنون Virtualized است** (`@tanstack/virtual-core@3.17.3`، ADR-029؛ ۲۰۲۶-۰۷-۰۵ — پس از کرش واقعی تب با وارد‌سازی ۵۰۰۰-۶۰۰۰ نودی، تست شده تا ۵۰۰۰ نود واقعی بدون کرش) |
| 5 | **Extractor** | هر ۱۰ Extractor واقعی و فعال: UUID/IP/Domain/Reality/Worker/DNS + Credentials/Transport/TLS Fingerprint/Flow (این ۴ تای آخر جدید). هیچ Placeholder غیرفعالی باقی نمانده |
| 6 | **Export Center** | کامل‌ترین صفحه: TXT، Xray JSON، Sing-box JSON، Normalized JSON، Analysis JSON، Clash YAML، CSV، PDF، Excel، Markdown، ZIP (+ manifest.json)، QR (اکنون Paginated، ۲۴‌تایی — فقط QR صفحه‌ی فعلی محاسبه می‌شود)، HTML Report (Escape + DOMPurify، ADR-018)، Portable Project Package (Export/Import کامل پروژه)، Clipboard Quick Copy — همگی واقعی |
| 7 | **Settings** | **Theme Engine** (Dark/Light/Auto با همگام‌سازی زنده با OS) **و Language Engine** (English/فارسی/Auto با سوییچ زنده‌ی `dir`/`lang` روی `<html>`، بدون Reload) — هر دو با Radio Card یکسان بازطراحی‌شده، هر دو Persist می‌شوند (`core/storage/local-adapter.js`). **+ سه توگل رفتاری ADR-030**: Strict Validation (پیش‌فرض خاموش — نودهای Warning را Rejected برچسب می‌زند، بدون حذف)، Auto-repair (پیش‌فرض روشن)، Deduplicate on import (پیش‌فرض روشن — تنها تغییر پیش‌فرض مصوب) — هر سه یک لایه‌ی Derived Status خالص (`core/validator/derive-status.js`) هستند، بدون منطق جدید در Parser/Validation Engine. **+ ردیف Data** با دکمه‌ی «Wipe all data» (تأیید دومرحله‌ای، `core/storage/wipe.js`، پاک‌سازی کامل IndexedDB+LocalStorage و Reload). ردیف Telemetry به‌صورت آگاهانه از طراحی حذف شد (تصمیم Owner) |
| 8 | **Developer Console** | هر ۷ بخش سند ۰۷ §۴.۷ واقعی (Parser/Warnings/Errors/Recovery/Validation Logs + Performance Logs، از طریق `usePerformanceState()`/ADR-021 + «Alternative Candidates» از Detection Logs، ADR-028) — رتبه‌بندی واقعی Parserهای رقیب که به Threshold رسیدند اما انتخاب نشدند، از `metadata.alternativeCandidates`. ۵ جدولی که با تعداد نود Scale می‌کنند اکنون Virtualized‌اند (`ui/components/virtual-table.tsx`) |

---

## i18n + RTL — وضعیت واقعی

`core/i18n/` (ADR-019) کامل و به هر ۸ صفحه + نوار ناوبری (`ui/components/nav.tsx`) وصل است:

- دو دیکشنری (`core/i18n/dictionaries/en.js`, `fa.js`) با **۳۴۱ کلید در هر دو زبان** (شمارش
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

- **۴ از ۵ فیچر گروه Visualization به‌طور کامل حذف شدند** (Node Relationship Map، Visual
  Topology Mapper، Cloudflare Topology View، Reality Visualizer) — نه Blocked، بلکه حذف کامل،
  چون هیچ داده‌ی چندموجودیتی/رابطه‌ای واقعی در UNM برایشان وجود ندارد. جزئیات در
  `docs/adr/ADR-026-VISUALIZATION-GROUP-NO-CHART-LIBRARY.md`.
- **`core/worker/converter.worker.js` به Converter Screen وصل است، ولی نه به Export Center** —
  Export Center (`ui/export/export-screen.tsx`) مستقیماً `core/exporter/` را روی Main Thread
  صدا می‌زند؛ یک تصمیم Scope جداست، نه باگ.
- **`core/normalizer/` و `core/detector/` از ساختار حذف شدند** — یک نتیجه‌ی معماری، نه محدودیت:
  منطق Detect/Normalize داخل خود هر Parser و `core/unm/mapper/` پیاده شده.
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
- **Extractor Level System Block رفع شد** — بررسی مستقیم فیلدهای `UNMNode` (نه حدس اسم) ۴
  گروه‌فیلد واقعی و مستقل پیدا کرد که در هیچ Extractor موجود استخراج نمی‌شدند: Credentials
  (`password`/`method`)، Transport (`host`/`path`)، TLS Fingerprint (`alpn`/`fingerprint`)،
  Flow (`flow`). هر ۴ با selector واقعی (`core/store/selectors.js`) و پنل جدول واقعی
  (`ui/extractor/extractor-screen.tsx`) اضافه شدند — عدد نهایی ۱۰ Extractor فعال از ۱۰ کل،
  دقیقاً روی آستانه‌ی پیشنهادی ۸-۱۰. جزئیات کامل در `ULTIMATE_BLUEPRINT_INDEX.md` بخش P12-12.
- **Custom Exporter API Block رفع شد** — `plugins/sip008-exporter/` نوشته شد، عکس دقیق
  `plugins/sip008-parser/` موجود: `UNMNode[]` را به همان سند رسمی JSON شادوساکس (SIP008)
  برمی‌گرداند، فقط نودهای `protocol: "shadowsocks"` را نمایش می‌دهد و بقیه را با `reason` واضح
  Skip می‌کند. ثبت‌شده از طریق `createPluginLoader`/`createPluginRegistry`
  (`core/plugin/app-plugins.js`)، با تست Round-Trip واقعی
  (`tests/plugin/sip008-exporter.test.js`)، و به یک گزینه‌ی واقعی در Export Center
  (`ui/export/export-screen.tsx`) وصل شد — تأییدشده با اسکرین‌شات واقعی Playwright. جزئیات کامل
  در `ULTIMATE_BLUEPRINT_INDEX.md` بخش P12-13 و `docs/adr/ADR-020-PLUGIN-SYSTEM.md`.
- **`riskScore` نهایی رفع شد — آخرین Flag باز کل پروژه** — یک ADR رسمی جدید
  (`docs/adr/ADR-027-RISK-SCORE-FORMULA.md`) هر دو زیرمسئله را حل کرد: (الف) `compatibilityScore`
  (پیش‌نیاز، تا امروز اصلاً محاسبه نمی‌شد) از میانگین ۶ کلاینت نام‌برده در `CompatibilityAnalysis`
  (`true`→۱۰۰, `false`→۰, `null`→۵۰ خنثی)، (ب) `riskScore` از میانگین وزنی سه ورودی مستقل —
  Security ۵۰٪، DNS ۳۰٪، Compatibility ۲۰٪. یافته‌ی معماری واقعی این ADR: سهم Reality از قبل
  به‌طور کامل داخل `securityScore` (شمارش `reality.issues`) و `compatibilityScore`
  (`REALITY_CLIENT_SUPPORT`) جذب شده بود — پس یک ترم چهارم مجزا برای Reality اضافه نشد (اثبات‌شده
  با تست یکپارچگی واقعی در `tests/analyzer/analyze-node.test.js`). پیاده‌سازی در
  `core/analyzer/risk-score.js`، وصل به `analyzeNode()`، و نمایش در Analyzer Screen (ردیف
  «Risk Score» زیر Security Analysis، ردیف «Compatibility Score» بالای جدول Platform & Client
  Compatibility) — تأییدشده با اسکرین‌شات واقعی Playwright. جزئیات کامل در سند ۰۶ §۳.۱ و
  `docs/adr/ADR-027-RISK-SCORE-FORMULA.md`.
- **«Recent Exports» (Dashboard) رفع شد** — یک ماژول جدید و کاملاً مستقل
  (`core/store/recent-exports-state.js`) دقیقاً با الگوی `settings-state.js` (LocalStorage،
  Write-Through Sync، سقف ۱۰ ورودی با حذف قدیمی‌ترین) نوشته شد؛ فقط متادیتای Export (فرمت،
  تعداد نود، Timestamp) را نگه می‌دارد — نه خودِ محتوا، و نه هیچ ارتباطی با
  `parserStore`/`analyzerStore`. هر ۴ تابع دانلود در Export Center
  (`ui/export/export-screen.tsx`: `handleDownload`, `handleDownloadZip`, `handleDownloadQr`,
  `handleDownloadHtmlReport`) فقط بعد از یک Export واقعاً موفق (با محاسبه‌ی
  `nodes.length - skipped.length`، یا بدون‌قید برای QR/HTML Report که ساختاراً هرگز Skip
  نمی‌شوند) یک ورودی ثبت می‌کنند. پنل Dashboard دقیقاً با الگوی بصری «Recent Imports» اضافه شد،
  شامل حالت خالی صادقانه (Rule 9). کامنت بالای `dashboard-screen.tsx` به‌روزرسانی شد تا این را
  به‌عنوان اولین استثنای مستند «nothing here is a new computation» توضیح دهد. تست واحد کامل در
  `tests/store/recent-exports-state.test.js` (شامل تست سقف ۱۰ ورودی).
- **«Alternative Candidates» (Developer Console) رفع شد** — یک Lightweight ADR جدید
  (`docs/adr/ADR-028-ALTERNATIVE-CANDIDATES-METADATA.md`) رتبه‌بندی‌ای را که
  `core/parser/factory.js#parseWithFallback` از قبل محاسبه می‌کرد (ولی گذرا بود و هرگز نگه
  داشته نمی‌شد) روی یک فیلد اختیاری جدید `metadata.alternativeCandidates` نگه می‌دارد — بدون
  هیچ تغییری در منطق انتخاب/Fallback Parser یا در `metadata.confidence` (برنده‌ی خودش دست‌نخورده
  می‌ماند). این تغییر هم در مسیر اصلی مرورگر (`core/worker/parser.worker.js` +
  `unflatten-node.js`، Worker پیش‌فرض طبق ADR-016) و هم در Fallback تک‌رشته‌ای
  (`core/parser/parse-and-validate.js`) وصل شد — نه فقط یکی. `selectDetectionLog`
  (`core/store/selectors.js`) گسترش یافت تا هر دو نیمه‌ی «Detection Logs» را با هم برگرداند.
  در UI، اگر نودی فقط یک Candidate واجد شرایط داشت (پارسر دیگری به Threshold نرسید)، پیام
  صادقانه‌ی «تنها پارسر واجد شرایط» نشان داده می‌شود، نه جدول خالی گمراه‌کننده (Rule 9). تست
  واحد واقعی با یک کانفیگ sing-box واقعی که Xray هم رویش به Threshold می‌رسد (بدون Mock) در
  `tests/parser/parse-and-validate.test.js` و `tests/worker/parser-worker.test.js`.
- **سه مورد از چهار «Deferred» باقی‌مانده‌ی Subscription Center رفع شدند** (تحلیل مقدماتی تأیید
  کرد هیچ‌کدام نیاز به ADR ندارند): **Deduplicate Nodes** — دکمه‌ی واقعی «Run Deduplicate» که
  دقیقاً همان معیار تست‌شده‌ی `duplicateKey` (`core/analyzer/extended/subscription-analyzer.js`،
  اکنون Export شده) را برای نگه‌داشتن قدیمی‌ترین نود هر گروه و حذف بقیه از طریق
  `selectDeduplicatedNodes` (`core/store/selectors.js`) به‌کار می‌برد. **Split Subscription** —
  از همان مکانیزم انتخاب چک‌باکسی و `buildSubscription` که Subscription Builder از قبل
  استفاده می‌کند، برای ساخت یک خروجی جدا از زیرمجموعه‌ی انتخاب‌شده. **Tag Nodes** — طبق تصمیم
  کاربر، گزینه‌ی «Store مستقل» (نه فیلد روی UNMNode): `core/store/node-tags-state.js`، دقیقاً
  با الگوی `recent-exports-state.js` (نگاشت `nodeId -> string[]`، LocalStorage)، بدون سقف تعداد
  Tag و بدون نیاز به ADR (چون `nodeId` پایدار است، Rule 4). یک `pruneOrphans()` بعد از
  Deduplicate، Tagهای یتیم را پاک می‌کند. تست‌های واحد کامل در `tests/store/selectors.test.js`
  (`selectDeduplicatedNodes`) و `tests/store/node-tags-state.test.js`.
- **«Merge Subscription» رفع شد — آخرین مورد باقی‌مانده‌ی کل پروژه.** یک پنل جدید در
  Subscription Center (Textarea + دکمه‌ی «Import & Merge») دقیقاً همان Pipeline واقعی
  `ui/store/parser-worker-client.js#parseRawConfig` را صدا می‌زند — همان تابعی که Converter
  Screen استفاده می‌کند (Worker واقعی + Fallback تک‌رشته‌ای زیر `file://`، بدون مسیر جدید)، و
  نتیجه را با `parserStore.addNode(node)` یکی‌یکی به Node List موجود اضافه می‌کند — نه
  `setNodes` که جایگزین می‌کرد. طبق تصمیم قبلی، Merge خودکار Deduplicate نمی‌زند (دو عمل تک‌منظوره‌ی
  جدا می‌مانند). خطای Parse (فرمت ناشناخته) پیام واضح نشان می‌دهد و Node List موجود را دست‌نخورده
  نگه می‌دارد (نه Crash، نه از‌دست‌رفتن داده). تست E2E واقعی در
  `tests/e2e/subscription-merge.spec.js` — یک سناریو ثابت می‌کند Merge واقعاً «اضافه» می‌کند
  (نه جایگزین)، سناریوی دیگر ثابت می‌کند یک خطای فرمت ناشناخته نه Crash می‌کند و نه چیزی از
  Node List موجود را پاک می‌کند.
- **کرش بحرانی Subscription Center با ۵۰۰۰+ نود رفع شد (2026-07-05، ADR-029).** یک محرک واقعی،
  نه یک بهینه‌سازی اختیاری: وارد‌سازی یک فایل واقعی با ~۵۰۰۰-۶۰۰۰ کانفیگ، تب مرورگر را کامل
  کرش می‌داد (`NodeTable` با Preact `.map()` خام کل آرایه‌ی نودها را رندر می‌کرد). Node List
  اکنون Virtualized است: `@tanstack/virtual-core@3.17.3` (تنها گزینه‌ی هم‌زمان Actively
  Maintained و بدون نیاز به `preact/compat` — `virtua` به React وابسته است، `preact-virtual-list`
  از ۲۰۲۲ آپدیت نشده؛ جزئیات کامل رد رقبا در ADR-029)، مصرف‌شده از طریق یک Hook اختصاصی
  Preact (`ui/components/use-virtualizer.ts`، بدون کتابخانه‌ی جدید برای خود Hook). فقط ردیف‌های
  داخل Viewport (+ Buffer) رندر می‌شوند — دو `<tr>` Spacer قبل/بعد ارتفاع ردیف‌های خارج از دید
  را حفظ می‌کنند، بدون از‌دست‌دادن ساختار واقعی `<table>` (بدون بازنویسی به CSS Grid). تمام
  قابلیت‌های قبلی (چک‌باکس، Sort/Filter/Group، دکمه‌های per-row) دقیقاً حفظ شدند. تست Playwright
  واقعی با ۵۰۰۰ نود ساختگی (`tests/e2e/subscription-virtual-list.spec.js`) بدون کرش، در کمتر از
  ۲۰ ثانیه رندر، و اسکرول واقعی تا محتوای میانی لیست را تأیید می‌کند؛ تست واحد جداگانه برای خود
  محاسبه‌ی Viewport/Buffer در `tests/ui/components/use-virtualizer.test.js`. حین اندازه‌گیری
  gzip این مرحله، یک Drift ۳۰۱۱۶ بایتی از Checkpointهای قبلی (بین ADR-018 و این مرحله) کشف و
  شفاف ثبت شد — جزئیات کامل در `14-DEPENDENCY_POLICY.md` §۲.۱ و ADR-029.
- **دو باگ واقعی همان‌روزه‌ی Virtual List رفع شدند** (بازبینی مستقل، همان تاریخ): (۱) `<thead>`
  با اسکرول از دید خارج می‌شد — `.table-scroll--virtual`'s bounded height باعث می‌شد بعد از
  ~۱۱ ردیف، هیچ برچسب ستونی دیده نشود؛ رفع با `position: sticky` روی `.data-table th`، فقط
  داخل همین یک Container محدود (بقیه‌ی `.table-scroll`های پروژه بدون Max-Height‌اند، نیازی به
  رفع ندارند) + یک Background مات (نه شفاف پیش‌فرض) تا ردیف‌های در حال اسکرول از پشت هدر دیده
  نشوند (Light+Dark). (۲) حالت Group هر پروتکل را در یک `NodeTable` مجزا (با همان Max-Height)
  رندر می‌کرد — با ۵-۶ پروتکل یعنی ۵-۶ ناحیه‌ی اسکرول تودرتو. یک کامپوننت جدید،
  `NodeTableGrouped`، هر گروه را کامل و بدون محدودیت ارتفاع رندر می‌کند (نه Virtualized،
  چون subset حاصل از Search/Filter معمولاً بسیار کوچک‌تر از کل لیستی است که واقعاً کرش داد) —
  دقیقاً مثل بقیه‌ی جدول‌های پروژه، صفحه از روی کل جدول هر گروه رد می‌شود. برای جلوگیری از
  تکرار کد، بدنه‌ی هر `<tr>` به یک کامپوننت مشترک (`NodeTableRow`) استخراج شد که هم نسخه‌ی
  Virtualized (`NodeTable`) و هم نسخه‌ی Group (`NodeTableGrouped`) از آن استفاده می‌کنند — رفتار
  هر دو دقیقاً یکسان. تست ۵۰۰۰-نودی حالت تخت بدون تغییر Pass می‌ماند (رگرسیون‌ای رخ نداد)؛ دو
  تست e2e جدید این دو رفع را مستقیماً تأیید می‌کنند
  (`tests/e2e/subscription-virtual-list.spec.js`).
- **محدودیت واقعی Xray Parser رفع شد — ریشه‌ی JSON یک Array از چند کانفیگ کامل Xray** (فرمت
  Export برخی ابزارها مثل v2rayN: هر آیتم آرایه یک سند کامل `{log, outbounds, ...}` است، نه
  یک `outbounds` چند-آیتمی داخل یک سند تکی). `detectXray()`/`toOutbounds()` قبلاً فقط شکل
  تک-سند را می‌شناختند — یک فایل واقعی کاربر در این قالب کاملاً «Unknown Format» می‌شد.
  `collectOutbounds()` (`core/parser/xray/extract.js`) اکنون وقتی ریشه یک Array است، در هر
  عنصر آن با همان منطق تک-سند موجود Recurse می‌کند (نه یک قانون جدا/سست‌تر). `detectXray()`
  برای این شکل Confidence را یک پله محافظه‌کارانه‌تر از حالت تک-سند معادل برمی‌گرداند (۸۵ در
  برابر ۹۵) چون یک Array خام سیگنال کمی کمتر اختصاصی است. `producesMany`/`normalizeManyXray`
  از قبل عمومی بودند (چند-Outbound تک-سند از قبل پشتیبانی می‌شد) — هیچ تغییری نیاز نداشتند و
  هر عنصر آرایه بدون Outbound معتبر (مثلاً فقط `freedom`) بی‌صدا Skip می‌شود، نه فرضی ساخته
  می‌شود (Rule 9). فرمت تک-سند قبلی کاملاً بدون تغییر رفتار ماند (۴۲ تست واحد قبلی همگی
  Pass). تست مقیاس واقعی: یک آرایه‌ی ۱۸۰۰-سندی (`tests/regression/xray-array-export.test.js`)
  در ~۵۰ms کامل Parse/Normalize می‌شود؛ یک تست e2e سرتاسر با آرایه‌ی ۱۵۰۰-سندی
  (`tests/e2e/xray-array-import.spec.js`) هم مسیر Worker واقعی هم رندر Virtual List را با هم
  در کمتر از ۴ ثانیه، بدون کرش، تأیید می‌کند.
- **سه مشکل واقعی کارایی/رفتاری بعد از یک Import ~۳۰۰۰ نودی رفع شدند:**
  - **(بحرانی) Export Center و Developer Console چند دقیقه لگ داشتند** — دقیقاً همان الگوی
    `.map()` خام روی کل آرایه که در Subscription Center کرش کامل داد و با Virtual List حل شد،
    ولی هرگز به این دو صفحه اعمال نشده بود. یک کامپوننت مشترک جدید،
    `ui/components/virtual-table.tsx` (همان `use-virtualizer.ts` + تکنیک Spacer-Row)، حالا
    ۵ جدول Developer Console (Parser Logs، Warnings & Errors، Validation Logs، Detection Logs،
    Alternative Candidates) را Virtualize می‌کند — Performance Logs (همیشه دقیقاً ۳ ردیف) و
    Recovery Logs (Subset از نودهای واقعاً بازیابی‌شده، ذاتاً کوچک) عمداً دست‌نخورده ماندند، چون
    هیچ‌کدام واقعاً با تعداد نود Scale نمی‌کنند. برای QR Export، مشکل ریشه‌ای صرفاً رندر نبود —
    `exportQr(nodes)` برای هر نود یک محاسبه‌ی واقعی Reed-Solomon (`encode()`) هم‌زمان روی کل
    آرایه اجرا می‌کرد؛ Virtualize‌کردن فقط DOM این را حل نمی‌کرد. راه‌حل انتخاب‌شده Pagination
    واقعی بود (نه Virtualization) — چون `.qr-grid` یک Grid چندستونی Responsive است (نیاز به
    2-D Virtualization پیچیده)، و چون QR ذاتاً برای اسکن تکی با موبایل است، نه اسکرول بی‌نهایت؛
    اکنون فقط QR صفحه‌ی فعلی (۲۴‌تایی) واقعاً محاسبه می‌شود. زمان واقعی اندازه‌گیری‌شده با ۳۰۰۰
    نود: Export Center ~۸۶۷ms، Developer Console ~۲۵۵۸ms (هر دو قبلاً چند دقیقه).
  - **(مهم) دکمه‌ی Analyze گاهی در Loading گیر می‌کرد** — بررسی مستقیم `analyzeBatch()` نشان داد
    محاسبه‌ی ۳۰۰۰ نود واقعی فقط **~۵۷ میلی‌ثانیه** طول می‌کشد؛ پس کندی محاسبه هرگز علت نبود.
    بازتولید مستقیمِ سناریوی «گیرکردن» با Playwright (کلیک پیاپی، رفتن/برگشت بین صفحات حین
    Analyze، Deduplicate هم‌زمان) در مقیاس‌های واقع‌گرایانه ممکن نشد؛ اما بازبینی دقیق
    `core/worker/worker-manager.js` و `core/worker/shared/handler-envelope.js` یک نقطه‌ضعف
    واقعی و قابل‌اثبات پیدا کرد: نه فراخوانی `idle.worker.postMessage(...)` (سمت Main Thread،
    ارسال Job به Worker) و نه `self.postMessage(response)` (سمت Worker، ارسال نتیجه به عقب)
    هیچ‌کدام محافظت نداشتند — اگر Payload یا Result به هر دلیلی (مثلاً یک مقدار غیرقابل‌Clone
    غیرمنتظره) نتواند از مرز Structured-Clone عبور کند، `postMessage` به‌صورت Synchronous پرتاب
    می‌کند و هیچ پیام/خطایی هرگز نمی‌رسد — یعنی Slot برای همیشه Busy می‌ماند و Promise آن Job
    برای همیشه Unsettled — دقیقاً همان «قفل‌شدن دائمی» که سند ۱۰ §۶.۱ صراحتاً منع می‌کند. هر دو
    نقطه اکنون با try/catch محافظت شده‌اند: سمت Main Thread بلافاصله Job را Failed می‌سازد و
    Slot را آزاد می‌کند؛ سمت Worker یک Envelope شکست حداقلی (و قطعاً Clone‌پذیر) به‌جای نتیجه‌ی
    اصلی می‌فرستد. این نقطه‌ضعف با استدلال کامل و صادقانه مستند شد — علت دقیق گزارش کاربر
    قطعیت صد‌درصد ندارد (چون بازتولید مستقیم ممکن نشد)، ولی این دقیقاً همان کلاس باگ («گاهی،
    نه همیشه، وابسته به داده») است که با رفع آن، این مسیر Deadlock بسته شد. تست واحد جدید
    (`tests/worker/worker-manager.test.js`, `tests/worker/handler-envelope.test.js`) هر دو
    مسیر را با یک Worker/Response ساختگی که واقعاً پرتاب می‌کند، تأیید می‌کند.
  - هر ۳ مورد با تست‌های حجم بالای ۳۰۰۰-نودی (`tests/e2e/scale-3000-nodes.spec.js`) پوشش داده
    شدند؛ تست‌های e2e موجود Export Center/Developer Console بدون تغییر رفتار Pass ماندند.
- **پیگیری چک‌پوینت بالا — دو مورد جدید/باقی‌مانده گزارش و بررسی شدند:**
  - **Converter و Extractor همان مشکل `.map()` بدون محدودیت را داشتند** — چک‌پوینت قبلی فقط
    Export Center/Developer Console را اصلاح کرد؛ جدول «Normalized Object» در
    `ui/converter/converter-screen.tsx` و هر ۱۰ پنل `ui/extractor/extractor-screen.tsx` هنوز
    با `.map()` خام روی کل آرایه‌ی نودها رندر می‌شدند، بدون اسکرول محدود داخلی — با ۳۰۰۰ نود، کل
    صفحه (نه یک کادر داخلی) اسکرول می‌شد. هر دو با همان `VirtualTable` مشترک اصلاح شدند، بدون
    تغییر هیچ‌کدام از قابلیت‌های موجود (کپی، دانلود، Badge پروتکل). **بررسی سیستماتیک هر ۸
    صفحه** (grep روی `.map(` بدون `VirtualTable`/`useVirtualizer` کنارش) یک مورد سومِ
    ازقلم‌افتاده هم پیدا کرد: جدول Security Ranking در Subscription Center
    (`ui/subscription/subscription-screen.tsx`) — این جدول دقیقاً ۱:۱ با تعداد نودهای
    Analyze‌شده Scale می‌کند و علاوه‌بر نبود Virtualization، هر ردیفش یک `nodes.find()` صدا
    می‌زد (O(n) در هر ردیف روی تا n ردیف = O(n²) کل پنل) — این هم به `VirtualTable` + یک
    Map با کلید `nodeId` برای Lookup با پیچیدگی O(1) اصلاح شد. سایر موارد بررسی‌شده و
    بدون‌نیاز‌به‌تغییر تشخیص داده شدند: لیست‌های `<ul>` Warnings (Dashboard)/Recovery Actions
    (Converter) فقط با تعداد Node واقعاً دارای مشکل Scale می‌کنند نه کل تعداد Node (هم‌راستا با
    منطق قبلاً مستندشده‌ی Recovery Logs در Developer Console)؛ `NodeTableGrouped` (حالت
    Group-by-protocol در Subscription Center) از قبل و آگاهانه بدون Virtualization طراحی شده
    (هر گروه زیرمجموعه‌ی لیست از‌قبل Filter‌شده است)؛ Analyzer's node `<select>` یک Dropdown
    بومی مرورگر است، نه یک `<table>`/`<ul>` دستی، و مرورگرها هزاران `<option>` را خوب مدیریت
    می‌کنند. تست‌های حجم بالای جدید در `tests/e2e/scale-3000-nodes.spec.js` هر ۳ مورد اصلاح‌شده
    (Converter، Extractor، Security Ranking) را با ۳۰۰۰ نود پوشش می‌دهند.
  - **باگ Analyze دوباره بررسی شد، این‌بار دقیقاً با فرمت واقعی کاربر** — یک آرایه‌ی واقعی
    v2rayN Xray JSON (۲۰۸۰ تا ۳۰۴۰ سند، شکل دقیق `tests/e2e/xray-array-import.spec.js`) در
    ۲۶ اجرای واقعی Playwright با سناریوهای مختلف امتحان شد: ۱۲ اجرای مستقل با Reload کامل و
    تعداد نود متفاوت هر بار، ۱۰ چرخه‌ی پی‌درپی Import→Analyze در یک Session واحد بدون Reload،
    یک سناریوی دو-کلیک هم‌زمان روی Analyze، یک سناریوی رفتن به صفحه‌ی دیگر و برگشت حین Analyze،
    و یک سناریوی Deduplicate هم‌زمان با Analyze روی داده‌ی واقعاً دارای تکراری. **هیچ‌کدام از
    ۲۶ اجرا گیر نکردند** و هیچ Console Error/Page Error‌ای هم ثبت نشد. کد `normalizeManyXray`
    (`core/parser/xray/normalize.js`) هم به‌طور مستقیم بازبینی شد — فقط رشته/عدد/آرایه‌ی رشته/
    Object ساده می‌سازد (از `JSON.parse` گرفته‌شده، پس هیچ `Symbol`/`Function`/Reference
    چرخه‌ای‌ای در مسیر Array وجود ندارد که با مسیرهای Parser دیگر فرق داشته باشد). با صداقت
    کامل: باگ این‌بار هم بازتولید مستقیم نشد؛ فیکس چک‌پوینت قبلی (محافظت `postMessage` در هر دو
    جهت) دست‌نخورده و فعال باقی می‌ماند چون همچنان تنها نقطه‌ضعف واقعی و قابل‌اثبات شناخته‌شده در
    این مسیر است.
- **پیگیری سوم — سرنخ‌های تازه‌ی کاربر روی Analyze + دو مشکل بصری جدید:**
  - **فرضیه‌ی Pool-Size-Dependent (Analyze) با Pool مصنوعاً بزرگ (۱۶) تست و رد شد.** کاربر
    اطلاعات تازه‌ای داد: در حالت گیرکرده، Performance Logs's analyzer pool واقعاً BUSY=1
    نشان می‌داد؛ مشکل بیشتر با تعویض صفحه/Reload رخ می‌دهد نه صرف کلیک تکراری؛ گاهی با تأخیر
    طولانی خودش درست می‌شود؛ و در دسکتاپ (Pool بزرگ‌تر، طبق `computePoolSize` روی
    `navigator.hardwareConcurrency`) به‌مراتب بیشتر رخ می‌دهد. بررسی کد تأیید کرد: نه
    `analyzer-screen.tsx` و نه هیچ صفحه‌ی دیگری هرگز `cancel()` را روی Job در حال اجرا صدا
    نمی‌زند وقتی صفحه Unmount می‌شود — این عمداً است (Track/GenerationId خودش Job قدیمی را
    Stale می‌کند، طبق سند ۱۰ §۶.۱)، نه یک نقص. سه تست Vitest جدید با `poolSize: 16` دقیقاً
    همین سناریو («Job A هرگز Cancel نمی‌شود + Job B روی همان Track قبل از رسیدن نتیجه‌ی A
    صادر می‌شود») را شبیه‌سازی کردند: با Pool بزرگ، B فوراً روی یک Slot آزاد جدا از A دیسپچ
    می‌شود (نه صف)؛ B را هرگز مسدود نمی‌کند. یک تست تضادی با Pool کوچک (۱) نشان داد دقیقا
    برعکس فرضیه‌ی کاربر: تأخیر طولانیِ «خودش درست می‌شود» با Pool **کوچک** (نه بزرگ) سازگارتر
    است، چون آنجا B واقعاً باید در صف منتظر آزادشدن Slot توسط A بماند. یک تست سوم Reload کامل
    را شبیه‌سازی کرد (Manager جدید و مستقل، بدون هیچ راهی برای دسترسی Job قدیمی به آن) و
    تأیید کرد که Slotهای آن از صفر شروع می‌شوند. **در Playwright واقعی** (نه فقط Vitest)، با
    `navigator.hardwareConcurrency` روی ۱۶ (شبیه‌سازی دسکتاپ) و Import واقعی ۳۰۰۰ نود:
    سناریوی «Analyze بزن → فوراً برو صفحه‌ی دیگر → برگرد → دوباره Analyze بزن» و سناریوی
    «Reload کامل حین یک Job در حال اجرا» هر دو تأیید شدند — Performance Logs's analyzer BUSY
    همیشه به ۰ برمی‌گردد، هرگز گیر نمی‌کند
    (`tests/e2e/analyze-navigate-reload-race.spec.js`). یک یافته‌ی جانبی واقعی و قابل‌اثبات
    (نه فرضیه): هر سه Worker Pool (Parser/Analyzer/Converter) به‌صورت Eager در لحظه‌ی
    Load شدن `app.js` ساخته می‌شوند (نه فقط وقتی واقعاً استفاده می‌شوند) — با
    `hardwareConcurrency=16` این یعنی ۲۴ Worker Thread واقعی هم‌زمان، اندازه‌گیری‌شده مستقیم
    در یک تست Playwright. این یک بی‌نظمی واقعی منابع است که می‌تواند در سخت‌افزار قدرتمند به
    تأخیر Scheduling کمک کند، ولی چون تغییر آن (ساخت تنبل Worker) به یک تصمیم معماری
    مستندشده در ADR-016 (که دقیقاً به همین رفتار Eager برای Feature-Detection وابسته است)
    دست می‌زند، خارج از دامنه‌ی این بررسی (فقط «تست/تأیید یا رد فرضیه») نگه داشته شد و به‌جای
    اعمال، صادقانه گزارش می‌شود. نتیجه: با تست عمیق‌تر، مکانیزم داخلی Dispatch/Cancellation
    خودش هرگز به تعداد Slot وابسته به باگ نیست؛ ریشه‌ی دقیق نوسان دسکتاپ/موبایل کاربر هنوز
    قطعیت صد‌درصد ندارد، ولی این ۲۴-Worker-Eager یک عامل مشکوک واقعی و مستند برای پیگیری بعدی
    است.
  - **متن طولانی در Cloudflare Analysis/Worker Analysis بریده می‌شد** — `.kv-row dd`
    (theme.css) نه `overflow-wrap` داشت و نه `min-width:0` (پیش‌فرض Flex-Item)، پس یک رشته‌ی
    پیوسته‌ی طولانی (Encoded Data، Signals) بزرگ‌تر از کادر می‌شد و توسط `overflow:hidden`ِ
    خودِ `.glass-panel` بریده می‌شد. رفع شد با افزودن `min-width:0` + `overflow-wrap: anywhere`
    به `.kv-row dd` (سراسری، چون این کلاس در هر ۸ صفحه استفاده می‌شود). بررسی جای‌های مشابه:
    Extractor's Worker Encoded Data (جدول، نه `dl`) همین مشکل را به شکل ملایم‌تر داشت (به‌جای
    بریده‌شدن، کل جدول را عریض می‌کرد) — `overflow-wrap: anywhere` به `.data-table td` هم
    اضافه شد.
  - **Detection Logs و Alternative Candidates در Developer Console قاطی به‌نظر می‌رسیدند** —
    طراحی عمدی و قبلی بود (هر دو مفهوماً یک سؤالند، طبق کامنت خودِ کد)، نه رگرسیون؛ طبق
    ترجیح کاربر، جداسازی **بصری** (نه ساختاری/دو `.glass-panel` جدا) انتخاب شد: کلاس جدید
    `.panel-subsection` (Border بالا + پس‌زمینه‌ی کم‌رنگ روی عنوان زیر-بخش) اضافه و روی
    Alternative Candidates اعمال شد.
  - تست‌ها: ۳ تست Vitest جدید (`tests/worker/worker-manager.test.js`) + ۲ تست Playwright جدید
    (`tests/e2e/analyze-navigate-reload-race.spec.js`).
- **گزارش فوری — «Analyze همیشه و کاملاً خراب» (هم موبایل هم دسکتاپ):**
  - **بازتولید مستقیم دوباره تلاش شد و باز هم رخ نداد.** دقیقاً همان مسیر کاربر با مرورگر واقعی
    (نه فقط Vitest) امتحان شد: Import همان فایل واقعی Xray آرایه‌ای → Analyzer → Analyze —
    هم با `npx playwright test` هم با rebuild کامل (`npm run test:e2e`) تا مطمئن شویم آخرین
    Bundle واقعاً تست می‌شود. **هیچ گیرکردنی رخ نداد، هیچ Console/Page Error‌ای هم ثبت نشد.**
    یک بررسی مستقیم سطح Node هم روی داده‌ی واقعی (نه Mock) این فایل اجرا شد:
    `parseAndValidate` + `analyzeBatch` روی ۳۰۰۰ نود واقعی Xray-Array-درآمده، در ~۴۳ms کامل و
    بدون Exception اجرا شد.
  - **`git diff` بین آخرین Commit قبل از این چند چک‌پوینت اخیر UI و HEAD** (محدود به
    `core/analyzer/`, `core/worker/`, `ui/analyzer/`, `ui/store/`) نشان داد: **`core/analyzer/`،
    `ui/analyzer/`، و `ui/store/` اصلاً تغییری نکرده‌اند** — تنها دو فایل تغییر کرده‌اند
    (`core/worker/worker-manager.js` و `core/worker/shared/handler-envelope.js`)، و هر دو
    تغییر فقط افزودن try/catch محافظتی (چک‌پوینت دو مرحله قبل) بودند، بدون هیچ تغییری در
    مسیر معمول اجرا. توابعی که کاربر مظنون کرده بود
    (`computeCompatibilityScore`/`computeRiskScore`/`analyzeDnsLeakRisk`) از قبل از همه‌ی این
    چک‌پوینت‌ها در کد بوده‌اند (Commit `ffb4df7`) و در تست‌های ۳۰۰۰-نودی قبلی هم هزاران بار
    بدون خطا اجرا شده بودند.
  - با صداقت کامل: این‌بار هم علت دقیق مشخص نشد و بازتولید ممکن نشد؛ اگر کاربر هنوز آن را
    می‌بیند، مرورگر/دستگاه دقیق و متن هر خطای Console واقعی، بهترین ورودی بعدی خواهد بود.
  - **صرف‌نظر از ریشه، Safety-Net واقعی اضافه شد:** `ui/store/analyzer-worker-client.ts` اکنون
    هر Job Analyze را با یک Timeout ۳۰-ثانیه‌ای Race می‌کند (`withTimeout`). اگر Job در این بازه
    Settle نشود، یک `AnalyzeTimeoutError` مجزا (نه `CancelledError`) پرتاب می‌شود،
    `analyzer-screen.tsx` پیام واضح «تحلیل خیلی طول کشید — دوباره امتحان کنید» را نشان می‌دهد،
    و `isAnalyzing` (به‌خاطر `finally` موجود) همیشه به `false` برمی‌گردد — دکمه هرگز برای همیشه
    گیر نمی‌ماند. یک نکته‌ی فنی مهم که حین ساخت تست کشف شد: `cancel()`ِ موجود در
    `worker-manager.js` برای یک Job که از قبل در حال اجراست (نه در صف) فقط آن را Stale علامت
    می‌زند، ولی Slot را واقعاً آزاد نمی‌کند (به پیام واقعی Worker برای آزادسازی متکی است) — برای
    یک Worker واقعاً و برای‌همیشه گیرکرده، این کافی نیست. یک متد جدید `forceRelease(jobId)` به
    `worker-manager.js` اضافه شد: علاوه‌بر Settle کردن Job، Worker همان Slot را واقعاً
    `terminate()` و با یک نمونه‌ی تازه جایگزین می‌کند — Timeout حالا هم Promise سمت UI را
    آزاد می‌کند هم واقعاً ظرفیت Pool را پس می‌گیرد، نه فقط علامت‌گذاری.
  - تست‌ها: ۷ تست Vitest جدید (۴ برای `forceRelease` در `tests/worker/worker-manager.test.js`،
    ۲ برای مسیر Timeout در `tests/ui/store/analyzer-worker-client.test.js` با Fake Timers) +
    یک تست Playwright واقعی (`tests/e2e/analyze-timeout-safety-net.spec.js`) که Worker واقعی
    Analyzer را طوری Override می‌کند که `postMessage`اش هرگز واقعاً اجرا نشود (نه یک Mock ساختگی
    کامل — ساخت Worker واقعی موفق می‌شود، فقط پیام هرگز نمی‌رسد) و تأیید می‌کند دکمه بعد از ۳۰
    ثانیه واقعاً آزاد می‌شود، خطای واضح نشان داده می‌شود، و یک Analyze جدید بعد از آن به‌طور
    عادی و سریع کامل می‌شود.
- **پیگیری چهارم — علت واقعی «Worker Error» پیدا شد: `analyzer.worker.js` باندل نشده بود.**
  کاربر تأیید کرد: (۱) این‌بار حتی با **یک نود تکی** رخ می‌دهد (فرضیه‌ی حجم داده منتفی شد)،
  (۲) متن دقیق خطا فقط همان رشته‌ی خام «Worker error» است، بدون جزئیات بیشتر. این خودِ رشته
  دقیقاً همان مقدار Fallback پیش‌فرض در `handleError()`ِ `worker-manager.js` است — یعنی وقتی
  یک رویداد Error واقعی از خودِ Worker Thread می‌رسد ولی `evt.message` خالی است. این کاملاً با
  یک Throw واقعی داخل `analyzeBatch` فرق دارد (آن یکی همیشه پیام واقعی JS Error را حمل می‌کند،
  از طریق مسیر عادی `{ok:false, error}`، نه `onerror`). قبل از نتیجه‌گیری، فرضیه‌ی «مشکل ورودی»
  با یک **Stress Test مستقیم روی ۲۶۴۶ ترکیب واقعی** (هر ۷ پروتکل × هر ۳ Security × هر ۷
  Network × ۱۸ مقدار بدشکل/تزریق‌شده هم‌زمان در همه‌ی فیلدهای اختیاری) رد شد — صفر خطا. سپس
  هر ۶ Core Analyzer + همه‌ی Extended Analyzerها مستقیم خوانده شدند — همه‌جا محافظت‌شده
  (`typeof`/`Array.isArray`/try-catch). نتیجه: منطق تحلیل مقصر نیست؛ خودِ **بارگذاری اسکریپت
  Worker** مقصر است. بررسی مستقیم با `esbuild --metafile` نشان داد `core/worker/
  analyzer.worker.js` (تنها Workerی که Bundle نشده بود، چون فقط چک «بدون Bare Specifier» را رد
  کرده بود) واقعاً **۱۸ فایل جدا** با Import نسبی است که یک Worker واقعی باید همه را تک‌تک
  Fetch/Link کند — دقیقاً همان کلاس خطای `Worker.onerror`ی که ADR-016 قبلاً برای Parser/Converter
  Worker مستند و رفع کرده بود (به‌خاطر `js-yaml`)، این‌بار بدون Bare Specifier بلکه به‌خاطر
  خودِ تعداد فایل‌های جدا. **رفع شد:** `scripts/build.js` یک Target سوم اضافه کرد
  (`assets/js/analyzer-worker.js`, ~۱۵KB Minified)، دقیقاً هم‌الگو با دو Worker دیگر؛
  `ANALYZER_WORKER_URL` در `analyzer-worker-client.ts` به آن اشاره می‌کند. کامنت نادرست قبلی
  («بدون Bare Specifier پس نیازی به Bundle نیست») در همان فایل و در ADR-016 (Addendum جدید)
  تصحیح شد. **صادقانه:** این از این محیط قابل تأیید مستقیم روی دستگاه/مرورگر واقعی کاربر نیست؛
  ولی یک بی‌نظمی معماری واقعی و دقیقاً هم‌شکل با نمونه‌ی قبلاً اثبات‌شده را می‌بندد. کل مجموعه‌ی
  تست e2e (۳۶ تست، شامل تست Timeout جدید) روی نسخه‌ی Bundle‌شده بدون رگرسیون Pass شد.
- **باگ CSS گسترده در تمام `.data-table` رفع شد — ستون‌ها فشرده و هدرها حرف‌به‌حرف Wrap
  می‌شدند، در هر دو زبان و هر دو Viewport.** کاربر خودش ریشه را درست تشخیص داده بود:
  `.data-table` فقط `width: 100%` داشت، بدون `table-layout` یا `min-width` — پس مرورگر با
  `table-layout: auto` پیش‌فرض، همه‌ی ستون‌ها (مثلاً ۱۲ ستون Node List: Include/Protocol/
  Address/Port/Valid/Security Score/Latency/Port Check/GeoIP/Imported At/Template/Tags) را
  به‌زور داخل عرض Container جا می‌کرد، به‌جای این‌که بگذارد `.table-scroll`'s
  `overflow-x: auto`ی از قبل موجود واقعاً فعال شود؛ ستون‌های باریک (GeoIP، Port Check) تا حد
  غیرقابل‌خواندن جمع می‌شدند و کلمات کوتاه هدر (فارسی و انگلیسی: «تأخیر»/«Latency»،
  «بررسی پورت»/«Port Check») عمودی حرف‌به‌حرف می‌شکستند. **رفع:** در `assets/css/theme.css`،
  `.data-table` حالا `table-layout: fixed` دارد، به‌علاوه یک `min-width` واقعی (نه یک عدد
  دلخواه) که با `:has(th:nth-child(N))` متناسب با تعداد واقعی ستون‌های هر جدول اعمال می‌شود —
  عدد پایه از جمع Width واقعی هر ستون در بدترین حالت (Node List ۱۲‌ستونی) به‌دست آمده: Include
  ۶۰ + Protocol ۱۰۰ + Address ۱۷۰ + Port ۷۰ + Valid ۸۰ + Security Score ۱۲۰ + Latency ۱۰۰ +
  Port Check ۱۱۰ + GeoIP ۱۵۰ + Imported At ۱۳۰ + Template ۱۱۰ + Tags ۱۶۰ = **۱۳۶۰px**، یعنی
  میانگین ~۱۱۳px به‌ازای هر ستون — این میانگین سپس متناسب با تعداد ستون هر جدول دیگر (۴ تا ۹
  ستونی، در Converter/Extractor/Developer Console) دوباره ضرب شده، نه این‌که همان ۱۳۶۰px به
  هر جدول کوچک تحمیل شود (که Scroll افقی غیرضروری روی جدول‌های ۳-۴ ستونی می‌ساخت).
  `.data-table th` هم `white-space: nowrap` گرفت (فقط هدر — `td`ی موجود با
  `overflow-wrap: anywhere`ش برای مقادیر طولانی مثل Base64 دست‌نخورده ماند، چون آن قانون خودش
  درست بود). با Grep تأیید شد هیچ صفحه‌ای (Subscription Center/Extractor/Converter/
  DevConsole/Export Center) یک Override اختصاصی روی `.data-table` ندارد که این رفع را خنثی
  کند — پس تغییر روی یک کلاس مشترک، خودکار روی همه جا اثر گذاشت. رگرسیون روی VirtualTable/
  Virtual List بررسی و رد شد: `useVirtualizer` ارتفاع ردیف‌ها را از خودِ Container اسکرول
  اندازه می‌گیرد، نه از عرض جدول — کاملاً مستقل از `table-layout`. تست جدید
  `tests/e2e/data-table-column-width.spec.js` (۶ تست، Chromium واقعی) تأیید می‌کند در هر دو
  زبان: هیچ `<th>`ی کلیدی هرگز به ارتفاع دو خط Wrap نمی‌شود و روی موبایل ۳۷۵px، عرض واقعی
  جدول (`scrollWidth`) از Container بزرگ‌تر است (Scroll افقی واقعی) نه این‌که ستون‌ها فشرده
  شوند. تأیید بصری با Playwright روی هر ۴ ترکیب (فارسی/انگلیسی × موبایل/دسکتاپ) برای
  Subscription Center، Extractor، و Developer Console انجام شد.
- **باگ QR Export مخصوص موبایل رفع شد — Page Size ثابت (۲۴) در گرید تک‌ستونی موبایل یعنی
  ۲۴ ردیف عمودی پشت‌سرهم.** کاربر خودش تشخیص داد: `.qr-grid` یک CSS Grid واکنش‌گراست
  (`repeat(auto-fit, minmax(160px, 1fr))`) که در دسکتاپ چند ستون تولید می‌کند ولی در موبایل
  فقط ۱ ستون واقعی — `QR_PAGE_SIZE = 24`ی ثابت قبلی برای هر دو حالت یکسان بود، پس در موبایل
  همان ۲۴ آیتم به‌جای چند ردیف کوتاه، ۲۴ ردیف بلند و پشت‌سرهم می‌شد؛ کاربر باید کل صفحه را
  اسکرول می‌کرد تا به Next برسد — دقیقاً برعکس هدف Pagination. **رفع:** یک فرمول واقعاً
  واکنش‌گرا جایگزین آن عدد ثابت شد. `ui/export/qr-pagination.ts` (تابع خالص، تست‌پذیر) ابتدا
  `computeQrColumnCount(containerWidthPx)` را با همان ریاضیات CSS Grid خودِ `.qr-grid`
  (`minmax(160px, 1fr)` + `gap: 16px`) محاسبه می‌کند — بزرگ‌ترین n که n ستون + (n-1) Gap در
  عرض واقعی Container جا شود؛ سپس `computeQrPageSize` آن را در `QR_ROWS_PER_PAGE = 5` (وسط
  بازه‌ی درخواستی «۴ تا ۶ ردیف») ضرب می‌کند — یعنی هر Viewport همیشه ۵ ردیف کامل می‌گیرد، نه
  یک عدد ثابت. عرض واقعی Container با یک Hook تازه، `ui/components/use-element-width.ts`
  (یک `ResizeObserver` واقعی روی خودِ عنصر `.qr-grid`، بدون کتابخانه‌ی جدید — همان API که
  `@tanstack/virtual-core` از قبل داخلی استفاده می‌کند)، اندازه‌گیری می‌شود؛ این یعنی چرخش
  واقعی موبایل از Portrait به Landscape یا تغییر اندازه‌ی پنجره‌ی دسکتاپ هم بلافاصله Page Size
  را دوباره محاسبه می‌کند، نه فقط بار اول. نتیجه با ۶۰ نود واقعی تأیید شد: دسکتاپ (۶ ستون)
  «Page 1 of 2» با ۳۰ آیتم در هر صفحه (رفتار قبلی حفظ شد)؛ موبایل (۱ ستون) «Page 1 of 12» با
  فقط ۵ آیتم در هر صفحه — صفحه‌ای واقعاً کوتاه، بدون نیاز به اسکرول طولانی. تست‌ها:
  ۸ تست واحد (`tests/ui/export/qr-pagination.test.js`، چند سناریوی عرض شامل نقاط مرزی دقیق
  ستون‌ها) + ۳ تست Playwright واقعی (`tests/e2e/qr-pagination-mobile.spec.js`، شامل یک تست
  Resize واقعی از موبایل به دسکتاپ که تأیید می‌کند Page Size بدون Reload صفحه بزرگ‌تر
  می‌شود). کل مجموعه‌ی e2e (۴۵ تست) بدون رگرسیون Pass شد، از جمله تست قبلی مقیاس ۳۰۰۰-نودی
  QR Export.
- **باگ واقعی در خودِ فلسفه‌ی Liquid Glass رفع شد — هدر Sticky جدول محتوای رد شونده را
  محو نمی‌کرد، فقط یک لایه‌ی رنگی نازک رویش می‌گذاشت.** کاربر با اسکرین‌شات نشان داد متن
  ردیف قدیمی («NODE ID»/«PARSER»/«CONFIDENCE») از پشت هدر Sticky کاملاً خوانا و روی هم
  افتاده بود. ریشه: `.table-scroll--virtual .data-table th` فقط
  `background: rgba(255,255,255,0.42)` داشت — دقیقاً همان Opacity که `.glass-panel` هم
  دارد، ولی `.glass-panel` این Opacity را همیشه همراه یک `backdrop-filter: blur(28px)
  saturate(160%)` واقعی می‌گذارد؛ اصل مکانیزم Liquid Glass (سند ۰۷ §۲) دقیقاً همین ترکیب
  «Opacity + Blur واقعی» است، نه Opacity به‌تنهایی — این هدر Sticky تنها جایی در کل پروژه
  بود که این ترکیب را نداشت (تأیید با `grep -n "position: sticky"` که فقط همین یک مورد
  را در کل `theme.css` نشان داد؛ پس Scope محدود به همین یک Selector بود). **رفع:**
  `backdrop-filter: blur(16px) saturate(160%)` (+ پیشوند `-webkit-` برای Safari) اضافه
  شد — نه ۲۸px سنگین `.glass-panel` (چون این یک نوار نازک تک‌ردیفی است، نه یک پنل بزرگ)
  و نه ۶px/۱۰px سبک آیکن‌های تزئینی موجود در فایل (که برای محو کردن متن واقعی کافی
  نیستند)؛ ۱۶px میان این دو، به‌اندازه‌ی کافی سنگین برای غیرقابل‌خواندن کردن متن رد شونده،
  و به‌اندازه‌ی کافی سبک برای یک عنصر `position: sticky` که هر فریم اسکرول دوباره Paint
  می‌شود. فقط یک‌بار در Rule پایه اعلام شد (نه در Override مربوط به
  `:root[data-theme="dark"]` که فقط `background` را عوض می‌کند) چون Cascade آن را در هر
  دو Theme به‌طور خودکار اعمال می‌کند. تأیید بصری با Playwright روی جدول واقعی Developer
  Console's Detection Logs (۳۰ نود، برای اسکرول کافی): در حالت Before، متن ردیف رد شونده
  زیر هدر کاملاً خوانا و روی هم افتاده بود؛ در حالت After (هم Light هم Dark)، همان متن
  واقعاً محو/غیرقابل‌خواندن شد، بدون هیچ همپوشانی متنی خوانا.
- **پیگیری دو-بخشی روی همان Sticky Header: بررسی Dark Mode Blur + رفع رنگ/خوانایی
  هدرهای جدول.** کاربر دو نگرانی مطرح کرد:
  - **بررسی #۱ (Dark Mode Blur):** آیا `backdrop-filter` واقعاً در Dark Mode Compute
    می‌شود، و آیا Opacity پس‌زمینه‌ی ۰.۰۶ کافی است؟ با Playwright مستقیم
    `getComputedStyle` گرفته شد: `backdropFilter: "blur(16px) saturate(1.6)"` —
    یعنی Blur واقعاً و کامل اعمال می‌شود (نه `"none"`)، دقیقاً طبق انتظار Cascade.
    مقدار Opacity پس‌زمینه (۰.۰۶) هم بررسی شد: این عدد نه یک باگ، بلکه دقیقاً همان
    مقداری است که خودِ `.glass-panel` در Dark Mode استفاده می‌کند
    (`:root[data-theme="dark"] .glass-panel { background: rgba(255,255,255,0.06) }`)
    — طبق کامنت مستند بالای همان بلوک، این «تکنیک استاندارد Frosted Dark Glass»ی
    عمدی است (نوری بسیار ملایم روی زمینه‌ی تقریباً سیاه، نه معکوس‌سازی رنگ)، در
    تقابل با مقدار بالاتر ۰.۱۴ که فقط برای کنترل‌های تعاملی (دکمه/Select/Input)
    با هدف «قابل کلیک بودن واضح» استفاده می‌شود — یک نیاز متفاوت. اسکرین‌شات مستقیم
    هم این را تأیید کرد: متن ردیف رد شونده در Dark Mode دقیقاً به همان اندازه‌ی
    Light Mode محو/غیرقابل‌خواندن است. **نتیجه: هیچ تغییری در این بخش لازم نبود** —
    مکانیزم فنی درست کار می‌کند و مقدار فعلی با بقیه‌ی طراحی Dark Mode هم‌خوان است.
  - **بررسی #۲ (رنگ/خوانایی هدر، باگ واقعی):** `.data-table th` از
    `var(--unct-text-muted)` استفاده می‌کرد — همان توکنی که برای متن‌های واقعاً
    فرعی (`.hint`, Caption, Placeholder) طراحی شده، نه برای برچسب هدر جدولی که
    کاربر باید مدام حین اسکرول چندین ردیف زیرش بخواند. **رفع:** رنگ به
    `var(--unct-text)` (رنگ اصلی، تمام‌کنتراست) تغییر کرد؛ اندازه‌ی فونت هم از
    ۱۱.۵px به ۱۲px کمی افزایش یافت (تأیید شد این تغییر جزئی هیچ‌کدام از آستانه‌های
    `min-width` محاسبه‌شده‌ی چک‌پوینت قبلی را نمی‌شکند — همان آستانه‌ها بر مبنای عرض
    سخاوتمندانه‌ی هر ستون هستند، نه عرض دقیق‌اندازه‌گیری‌شده‌ی خودِ برچسب).
    `text-transform: uppercase`/`letter-spacing`/`font-weight: 700` دست‌نخورده ماندند
    (دلیل مشخصی برای تغییرشان پیدا نشد). **بررسی جامع‌تر Scope:** همه‌ی ۱۵ مورد
    دیگر استفاده از `--unct-text-muted` در فایل مرور شد؛ دو مورد شبیه‌ترین به این
    الگو («برچسب کنار مقدار») بودند: `.field` (برچسب فرم‌ها مثل «Sort»/«Format» کنار
    هر Select/Input در همه‌ی صفحات) و `.kv-row dt` (برچسب سمت چپ ردیف‌های Key-Value
    در Analyzer/Extractor). هر دو عمداً Muted نگه داشته شدند: بر خلاف هدر جدول (که
    باید هنگام مقایسه‌ی پیوسته‌ی چند ردیف داده همیشه هم‌سطح با خودِ داده خوانا
    بماند)، این دو یک سلسله‌مراتب طراحی رایج و آگاهانه‌اند (برچسب کم‌رنگ‌تر، مقدار/
    کنترل پررنگ‌تر — دقیقاً مثل `.stat-label`/`.stat-value` در Dashboard)، و کاربر
    فقط یک‌بار در هر مورد آن را می‌خواند، نه در حین اسکن مداوم چند ردیف. `.nav-tab`
    هم بررسی شد: Muted بودنش State آگاهانه‌ی «غیرفعال» است (Tab فعال خودش پس‌زمینه‌ی
    گرادیانت/متن سفید می‌گیرد)، نه یک باگ خوانایی. `.panel-title` از قبل رنگ اصلی
    (نه Muted) دارد، نیازی به تغییر نداشت.
  - این تغییر روی کلاس مشترک `.data-table th` است، پس خودکار روی همه‌ی صفحات
    (Subscription Center، Extractor، Converter، DevConsole، Export Center) اثر
    گذاشت. تأیید بصری با Playwright روی هر ۴ ترکیب (Light/Dark × Desktop/Mobile،
    Developer Console's Detection Logs، ۳۰ نود): هدرها در هر چهار حالت اکنون
    واضح و پررنگ خوانا هستند، و محتوای رد شونده در هر دو Theme هنگام اسکرول واقعاً
    محو باقی مانده (بدون رگرسیون نسبت به رفع قبلی).
- **مشکل Dark Mode واقعاً برطرف شد این‌بار — چک‌پوینت قبلی کافی نبود، دقیقاً همان‌طور که
  کاربر مستقیم با چشم گزارش داد.** درس مهم این پیگیری: تأیید فقط با `getComputedStyle`
  (که چک‌پوینت قبلی نشان می‌داد `backdrop-filter` واقعاً `"none"` نیست) کافی نبود —
  خودِ محاسبه‌شدن Blur به‌تنهایی تضمین نمی‌کند نتیجه‌ی بصری واقعاً کافی است. این‌بار
  با یک روش دقیق‌تر تحقیق شد: یک Sweep واقعی روی چند موقعیت اسکرول (نه فقط یکی) +
  اسکرین‌شات با Crop دقیق و بسیار تنگ (دقیقاً روی Bounding Box خودِ `<th>`، با
  `deviceScaleFactor: 3` برای جزئیات بیشتر). نتیجه‌ی این تحقیق دقیق‌تر دو یافته‌ی
  مجزا داشت:
  - **یافته‌ی ۱ (واقعی، اصلاح شد):** در موقعیت‌های اسکرول غیرهم‌راستا با ارتفاع
    ردیف (مثلاً `scrollTop=30` یا `44` با ردیف‌های ~۳۸px)، متن ردیف رد شونده با
    Opacity قبلی (۰.۰۶ سفید، مطابق قرارداد `.glass-panel` در Dark Mode) واقعاً و
    به‌وضوح از پشت هدر خوانا بود — چون Blur پس‌زمینه را محو می‌کند ولی رنگ نهایی
    هنوز Composite با Opacity پایین پس‌زمینه‌ی خودِ هدر می‌شود؛ برای متن روشن روی
    زمینه‌ی تیره (برخلاف حالت Light که متن تیره روی زمینه‌ی روشن Blur می‌شود و از
    قبل به سفید نزدیک است)، یک لایه‌ی سفید فقط ۶٪-Opaque عملاً هیچ تغییری در
    روشنایی محو‌شده ایجاد نمی‌کند. **رفع قطعی:** به‌جای بازی با Opacity/Blur (که
    هیچ مقداری زیر ۱۰۰٪ نمی‌تواند صددرصد تضمین کند)، پس‌زمینه‌ی هدر در Dark Mode
    حالا کاملاً Opaque است: `rgb(53, 55, 58)` — این رنگِ جدید نیست، دقیقاً معادل
    مسطح‌شده‌ی همان ترکیب `rgba(255,255,255,0.14)` روی `--unct-bg` است که خودِ
    این فایل از قبل برای «سطح کنترلی» (`.select`/`.input`/`.btn--ghost`/
    `.radio-card`) استفاده می‌کند — پس هم‌خوان با بقیه‌ی Dark Mode است، هم صددرصد
    تضمین می‌کند هیچ محتوایی از پشتش دیده نشود (چون Opacity=۱، دیگر مسئله‌ی
    ترکیب رنگ مطرح نیست). چون در Opacity=۱، خودِ `backdrop-filter` هیچ اثر
    بصری‌ای ندارد (چیزی پشت یک لایه‌ی کاملاً Opaque هرگز دیده نمی‌شود صرف‌نظر از
    Blur)، آن Override هم از این‌جا حذف شد — کد مرده نمی‌ماند.
  - **یافته‌ی ۲ (توهم بصری، نه باگ واقعی — ولی رفع کمکی هم اضافه شد):** با Crop
    دقیق روی خودِ Bounding Box هدر (نه یک اسکرین‌شات عریض‌تر)، ثابت شد داخل
    محدوده‌ی واقعی هدر هیچ نشتی وجود ندارد — چیزی که در اسکرین‌شات‌های عریض‌تر
    «همپوشانی» به‌نظر می‌رسید، در واقع ردیف بعدی بود که (به‌خاطر ماهیت
    `position: sticky`) بلافاصله زیرِ هدر می‌نشیند، نه پشتش. برای این‌که هیچ
    ابهام بصری‌ای برای چشم واقعی کاربر باقی نماند (صرف‌نظر از این‌که فنی باگ
    باشد یا نه)، یک `box-shadow: 0 2px 6px rgba(0,0,0,0.18)` هم به خودِ هدر
    (هر دو Theme) اضافه شد — مرز بین هدر ثابت و محتوای در حال اسکرول را با یک
    سایه‌ی واقعی مشخص می‌کند، نه فقط یک Hairline Border ۱px که در Dark Mode
    تقریباً دیده نمی‌شد.
  - **تست جدید** (`tests/e2e/sticky-header-dark-opacity.spec.js`, ۲ تست): برخلاف
    چک‌پوینت قبلی که فقط `backdrop-filter !== "none"` را چک می‌کرد (که هیچ‌وقت
    نشان نمی‌داد Opacity کافی است یا نه)، این‌بار مستقیماً Alpha Channel واقعی
    رنگ پس‌زمینه‌ی هدر چک می‌شود: در Dark Mode باید دقیقاً `1` باشد (تضمین صددرصد،
    نه فقط «به‌اندازه‌ی کافی بالا»)؛ در Light Mode باید کمتر از `1` بماند (تأیید
    عدم رگرسیون روی رفع قبلی که آن‌جا واقعاً کار می‌کرد). هر دو روی یک موقعیت
    اسکرول عمداً غیرهم‌راستا (`scrollTop=20`) اجرا می‌شوند — همان موقعیتی که
    مشکل واقعی را نشان می‌داد، نه یک موقعیت هم‌راستا که به‌اشتباه تمیز به‌نظر
    می‌رسید. تأیید بصری نهایی روی هر ۴ ترکیب (Light/Dark × Desktop/Mobile) در
    همان موقعیت اسکرول دقیقاً همین سناریو را نشان داد: بدون هیچ متن خوانای
    رد‌شونده.
- **پیگیری سوم روی همان هدر: تعادل واقعی بین خوانایی و حس شیشه‌ای Liquid Glass.** بازخورد
  کاربر: راه‌حل قبلی (Opacity=۱۰۰٪، کاملاً Solid) مشکل خوانایی را حل کرد ولی هدر را
  «توپُر» و بی‌حس‌شیشه کرد — در تناقض با فلسفه‌ی خودِ پروژه که Liquid Glass همیشه
  Opacity+Blur است، نه رنگ صددرصد. با همان روش دقیق قبلی (Sweep روی چند موقعیت اسکرول
  + Crop تنگ با `deviceScaleFactor: 3`)، **بیش از ده مقدار مختلف** به‌صورت سیستماتیک
  تست شد: Opacity های ۰.۵۰ تا ۰.۹۸ (با گام‌های ۰.۵۵/۰.۶۵/۰.۷۵/۰.۸۵/۰.۹۲/۰.۹۶/۰.۹۷/۰.۹۸)،
  با Blur از ۲۰ تا ۲۴px، و چند نسخه با `brightness()` اضافه‌شده به `backdrop-filter`
  (برای کم‌نور کردن پس‌زمینه قبل از Composite شدن). **نتیجه‌ی صادقانه:** زیر Zoom
  دقیق و فورنسیک ۳x، **هیچ مقدار Opacity زیر ۱۰۰٪** ردِ خواناییِ متن را کاملاً صفر
  نمی‌کند — از نظر ریاضی، Alpha Blending فقط می‌تواند به صفر نزدیک شود، هرگز دقیقاً
  نمی‌رسد؛ این یک Trade-off واقعی است، نه کوتاهی در تلاش. ولی در مقیاس واقعیِ دیدن
  (Zoom عادی ۱x، نه یک فریم منجمدشده‌ی فورنسیک): مقادیر ۰.۸۵ و پایین‌تر هنوز واقعاً
  خوانا بودند، در حالی که **۰.۹۷ (با blur(20px))** دیگر در مقیاس عادی هیچ متنی نشان
  نمی‌دهد — و برخلاف نسخه‌ی Solid، یک گرادیان نرم و واقعی از روشنایی (حس شیشه‌ی
  مات واقعی، نه یک مستطیل تخت) هنوز به‌وضوح با چشم قابل‌تشخیص است. **مقدار نهایی
  انتخاب‌شده:** `background: rgba(20, 22, 26, 0.97)` + `backdrop-filter: blur(20px)
  saturate(160%)` — یک تصمیم آگاهانه و اعلام‌شده، نه یک‌طرفه: زیر بزرگنمایی فورنسیک
  یک اثر بسیار محو باقی می‌ماند (فقط با جست‌وجوی فعال قابل‌تشخیص)، در ازای هدری که
  در استفاده‌ی واقعی هم کاملاً ناخوانا و هم واقعاً شیشه‌ای است. **یافته‌ی جانبی
  صادقانه:** همین روش دقیق روی Light Mode (که قبلاً «درست» تأیید شده بود) هم اجرا
  شد — مشخص شد Light Mode هم دقیقاً همین محدودیت نظری را دارد (زیر Zoom فورنسیک
  یک رد بسیار محو دیده می‌شود)، ولی در مقیاس عادی کاملاً تمیز است؛ یعنی این
  Trade-off در هر دو Theme یکسان و متقارن است، نه یک نقص تازه در Dark Mode.
  تست‌های Playwright (`tests/e2e/sticky-header-dark-opacity.spec.js`) بازنویسی
  شدند تا هر دو جهت رگرسیون را هم‌زمان چک کنند: `alpha < 1` (رگرسیون به Solid) و
  `alpha >= 0.9` (رگرسیون به Opacity خیلی کم قبلی) + وجود واقعی `blur` در
  `backdrop-filter`.

- **پیگیری چهارم: علت واقعی پیدا شد — سه اصلاح قبلی، صورت مسئله را پاک کرده بودند، نه
  خودِ مسئله را.** کاربر یک اسکرین‌شات واقعی از استفاده‌ی خودش فرستاد (نه تست ساختگی):
  در جدول Parser Logs، مقدار Node ID (UUID ۳۶ کاراکتری) به‌وضوح روی ۲ خط Wrap شده بود؛
  در جدول Detection Logs، یک تکه از Node ID کاملاً خوانا کنار «XrayParser» و «95/100»
  درست روی مرز هدر Sticky نشسته بود — نه یک رد محو زیر Zoom فورنسیک، بلکه متن کاملاً
  خوانا در استفاده‌ی عادی. **علت واقعی:** هیچ‌کدام از ۳ اصلاح قبلی (که همه روی
  Opacity/Blur خودِ هدر متمرکز بودند) نمی‌توانستند این باگ را رفع کنند، چون این باگ اصلاً
  ربطی به شفافیت نداشت — یک ردیف داده (نه هدر) روی ۲ خط Wrap می‌شد، و هدر Sticky فقط به
  اندازه‌ی ارتفاع یک خط پوشش می‌دهد؛ پس خط دومِ ردیفِ Wrap‌شده هرگز واقعاً پشت هدر نبود،
  کنار آن، در فضای خودش، کاملاً قابل‌دیدن می‌نشست — صرف‌نظر از هر مقدار Opacity/Blur.
  ریشه: `table-layout: fixed` عرض ستون‌ها را به‌طور مساوی تقسیم می‌کند مگر یک `width`
  صریح روی ستون باشد؛ دو مقدار خام و بدون‌فرمت به این تقسیمِ مساوی در عرض‌های واقعی
  (زیر ۱۲۸۰px) نمی‌گنجیدند و هیچ‌کدام `width` صریح نداشتند: UUID ی ۳۶ کاراکتری (Node ID)
  و برچسب زمانی ISO 8601 ی ۲۴ کاراکتری (`createdAt`/`Imported At`). با بازتولید دقیق همان
  سناریو (Import واقعی یک آرایه‌ی ۳۰-سندی Xray JSON — همان شِمای واقعی v2rayN، نه فرمت
  قدیمی vmess که در تلاش اول اشتباهاً امتحان و رد شد) در Playwright واقعی روی چند عرض
  Viewport (۱۲۸۰/۱۰۰۰/۹۰۰px)، دقیقاً همین Wrap تکرار شد: ارتفاع ردیف به ۵۴-۵۵px می‌رسید
  (به‌جای ۳۸px تک‌خطی). **نکته‌ی روش‌شناسی مهم:** چک کردن `scrollWidth > clientWidth` روی
  تک‌تک سلول‌ها گمراه‌کننده بود — چون `<td>` ارتفاع ثابت ندارد و همیشه با محتوای خودش رشد
  می‌کند، پس `scrollHeight === clientHeight` برای **همه‌ی** سلول‌های یک ردیف درست است،
  حتی سلولی که واقعاً Wrap نشده، چون همه از ارتفاع نهاییِ ردیف (بلندترین سلول) پیروی
  می‌کنند؛ تنها راه قابل‌اعتماد، اندازه‌گیری مستقیم عرض واقعی متن رندرشده بود (با یک
  `<span>` موقت هم‌فونت). **اصلاح:** یک کلاس `col-nodeid` (عرض ۳۰۰px) و `col-timestamp`
  (عرض ۲۱۰px) به ستون Node ID و ستون‌های `createdAt`/`Imported At` در DevConsole
  (Parser Logs/Diagnostics/Validation Logs/Detection Logs/Alternative Candidates) و
  Subscription Center (Node List) اضافه شد. **اشتباه فرعیِ کشف‌شده و رفع‌شده حین کار:**
  اولین تلاش از `min-width` استفاده کرد که به‌اشتباه فرض شد مثل `min-width` روی خودِ
  جدول (اصلاح قبلی‌تر بند «باگ CSS گسترده») کار می‌کند — ولی در یک Real Browser مشخص
  شد `table-layout: fixed` فقط به `width` ردیفِ اول برای اندازه‌گیری ستون توجه می‌کند،
  نه `min-width`؛ پس آن اصلاح اول بی‌اثر بود و متنِ حالا `nowrap`شده به‌جای Wrap، روی
  ستون بعدی سرریز کرد (باگ دیگری، به همان اندازه واقعی) — با همان اسکرین‌شات واقعی
  کشف و با `width` صریح (که `table-layout: fixed` واقعاً به آن احترام می‌گذارد) درست
  شد. تأیید نهایی: بازتولید همان سناریوی دقیق کاربر (Detection Logs، Scroll به همان
  موقعیت) نشان داد ردیفِ رد شده اکنون واقعاً پشت هدر محو می‌شود (فقط یک سایه‌ی بسیار
  کم‌رنگ از پشت Blur، نه متن خوانا) — دقیقاً همان چیزی که کاربر خواسته بود. تست رگرسیون
  جدید (`tests/e2e/devconsole-row-wrap.spec.js`) روی ۳ عرض Viewport با Import واقعی
  Xray و روی Node List با یک تایم‌استمپ واقعی ISO، عدم Wrap شدن ردیف‌های داده — نه فقط
  هدرها — را برای همیشه قفل می‌کند (تست‌های قبلی `data-table-column-width.spec.js` فقط
  هدر را چک می‌کردند، نه ردیف‌های داده، پس این باگِ خاص را هرگز نمی‌گرفتند).

- **پیگیری پنجم: خودِ کاربر تعریف «بلر» را اصلاح کرد، و این تعریف نشان داد پیگیری سوم
  (Opacity=۰.۹۷) یک اشتباه روش‌شناسی داشته.** کاربر یک اسکرین‌شات واقعی از Light Mode
  فرستاد که در آن یک ردیف رد شده، زیر هدر Sticky، به‌صورت نرم و تار (نه کاملاً محو، نه
  کاملاً خوانا) دیده می‌شد — و صراحتاً گفت: «بلر یعنی چیزی رو تا حدی محو کردن، نه اینکه
  کاملاً مات کردن با پوشوندن». این یعنی معیار پیگیری سوم («زیر Zoom فورنسیک هم هیچ ردی
  نباید باشد») از اول اشتباه بود — چیزی که Light Mode خودش (با Opacity=۰.۴۲ واقعی
  Production) هرگز به آن معیار نمی‌رسید و کسی هم مشکلی با آن نداشت. با بازتست از صفر،
  روی همان ردیف‌های حالا-تک‌خطی (پیگیری چهارم) و در مقیاس واقعی دیدن (نه Crop فورنسیک
  ۳x که تست‌های قبلی استفاده کرده بودند): Dark Mode با Opacity=۰.۹۷ و Light Mode با
  Opacity=۰.۴۲ (فرمول واقعی و بدون‌تغییرش) دقیقاً همان حس «تار نرم، نه بلوک تخت» را
  نشان دادند — یعنی پیگیری سوم داشت معیاری را برآورده می‌کرد که خودِ Light Mode هرگز
  نداشت. Dark Mode حالا دقیقاً فرمول Light Mode را آینه می‌کند: `rgba(20, 22, 26, 0.42)`
  + `blur(16px)` (به‌جای مقدار جداگانه و سنگین‌تر ۰.۹۷ + `blur(20px)`) — هر دو Theme
  حالا از یک جنس‌اند، نه دو جنس با یک اسم. تست `sticky-header-dark-opacity.spec.js`
  بازنویسی شد: به‌جای `alpha >= 0.9`، حالا چک می‌کند `alpha` نزدیک ۰.۴۲ (هم‌راستا با
  Light Mode) است و رنگ پس‌زمینه واقعاً تیره است (رگرسیون به White Wash تلاش اول را هم
  می‌گیرد).

- **تنظیم دستی بعدی (درخواست مستقیم کاربر):** بعد از تأیید اصل رویکرد («تار نرم» به‌جای
  «بلوک تخت»)، کاربر خودش خواست Opacity Dark Mode پله‌پله بالاتر برود — ۰.۵۵ → ۰.۶۵ →
  ۰.۷۵ → **۰.۸۰ (مقدار فعلی)**. `blur(16px)` و بقیه‌ی فرمول (هم‌راستا با ساختار Light
  Mode) بدون تغییر ماندند؛ فقط عدد Opacity بالا رفت. تست
  `sticky-header-dark-opacity.spec.js` هر بار هم‌زمان با CSS به‌روزرسانی شد
  (`toBeCloseTo(0.80, 1)`) تا رگرسیون به مقدار قدیمی را بگیرد.

- **باگ سوم در همین خانواده — «متن عمودی حرف‌به‌حرف» روی موبایل (۲۰۲۶-۰۷-۰۷، اسکرین‌شات
  واقعی از موبایل).** کاربر یک اسکرین‌شات از Developer Console در حالت موبایل فرستاد که
  در آن ستون‌های «Parser»/«Source Type» به شکل عجیبی رشته‌های تک‌حرفی و عمودی نشان
  می‌دادند. **علت واقعی:** `.col-nodeid`/`.col-timestamp` (اصلاح دو Checkpoint قبل)
  عرض واقعی برای ستون‌های خودشان رزرو می‌کنند، ولی Tier های `min-width` سطح جدول
  (`:has(th:nth-child(N))`) که قبل از این دو کلاس نوشته شده بودند، از وجودشان خبر
  نداشتند: در جدول Parser Logs (۴ ستون)، Tier قدیمی فقط ۴۵۰px بودجه می‌داد، در حالی
  که خودِ دو ستون Node ID (۳۰۰px) + Created At (۲۱۰px) به‌تنهایی به بیش از ۵۱۰px
  نیاز داشتند — یعنی روی یک Viewport واقعی موبایل، دو ستون بدون‌کلاس باقی‌مانده
  («Parser»، «Source Type») سهم منفی/صفر می‌گرفتند؛ یک ستون با عرض صفر همچنان متنش را
  رندر می‌کند، و چون هیچ عرضی برای حتی یک حرف نیست، هر حرف روی خط خودش Wrap می‌شود —
  همان ظاهر «حروف عمودی روی هم» در اسکرین‌شات. بازتولید با Import واقعی Xray روی
  Viewport واقعی ۳۹۰px این را دقیقاً تأیید کرد (`getComputedStyle` نشان داد این دو
  ستون واقعاً `0px` عرض داشتند). **اصلاح:** Tier های `min-width` جدید و دقیق‌تر
  اضافه شد که هم تعداد ستون‌ها و هم حضور `.col-nodeid`/`.col-timestamp` را با هم چک
  می‌کنند (`:has(th:nth-child(N)):has(th.col-nodeid)`، با Specificity واقعی CSS
  بالاتر از Tier عمومی قدیمی، نه صرفاً ترتیب در فایل) — برای هر شکل واقعی جدول در
  DevConsole (Validation Logs ۲‌ستونی، Detection Logs/Alternative Candidates
  ۳‌ستونی، Diagnostics ۴‌ستونی، Parser Logs ۴‌ستونی با هر دو کلاس) و برای Node List
  در Subscription Center (که ستون Imported At حالا واقعاً ۲۳۰px به‌جای بودجه‌ی قدیمی
  ۱۳۰px نیاز دارد). تأیید نهایی: همان Viewport ۳۹۰px، همان Import واقعی — هیچ ستونی
  دیگر صفر نیست (`Parser`/`Source Type` هرکدام ۱۱۰px واقعی گرفتند). تست رگرسیون
  جدید در `devconsole-row-wrap.spec.js` اضافه شد که مستقیماً چک می‌کند هیچ Header
  روی موبایل به کمتر از ۳۰px نمی‌رسد.

- **باگ واقعی در عدد «Duplicate Nodes» ی Overview پیدا و رفع شد (۲۰۲۶-۰۷-۰۷).**
  `analyzeSubscription` (`core/analyzer/extended/subscription-analyzer.js`) برای هر
  گروه تکراری، کل تعداد اعضای گروه را جمع می‌زد (`duplicateNodeCount += nodeIds.length`)
  — نه فقط تعدادی که واقعاً با اجرای Deduplicate حذف می‌شود. کاربر یک فایل ۲۹۹۲ نودی
  Import کرد و Overview نشان داد Total Nodes = Duplicate Nodes = 2992 (دقیقاً برابر)،
  که این‌طور خوانده می‌شد که انگار همه‌ی نودها حذف خواهند شد — در حالی که Deduplicate
  واقعی (`core/store/selectors.js#selectDeduplicatedNodes`) از هر گروه، دقیقاً یک نود
  (اولین/قدیمی‌ترین بر اساس `createdAt`) نگه می‌دارد؛ تأیید شد بعد از Run Deduplicate
  واقعی به ۷۳۶ نود رسید (۲۲۵۶ حذف شد، نه ۲۹۹۲). **اصلاح:** برای هر گروه با
  `nodeIds.length` عضو، به‌جای کل `nodeIds.length`، مقدار `nodeIds.length - 1` جمع زده
  می‌شود (چون یکی از هر گروه نگه داشته می‌شود) — دقیقاً هماهنگ با معیار «نگه‌داشتن
  اولین بر اساس `createdAt`» در `selectDeduplicatedNodes`؛ یک کامنت صریح در هر دو
  محل این وابستگی را مستند می‌کند تا در آینده کسی این دو را جدا از هم عوض نکند. بررسی
  شد که `duplicateNodeCount`/`duplicateGroups` جای دیگری (HTML Export و غیره) با
  منطق قدیمی استفاده نمی‌شدند — تنها محل نمایش، همین Overview بود. تست واحد موجود
  به‌روزرسانی و یک تست چند-گروهی جدید (گروه‌های ۲ و ۳ عضوی) اضافه شد که فرمول قدیم و
  جدید را آشکارا متفاوت نشان می‌دهد؛ یک تست E2E موجود (`subscription-summary.spec.js`)
  هم همین باگ قدیمی را در انتظارش داشت و اصلاح شد. **تأیید بصری واقعی:** یک سناریوی
  واقعی با ۳۰ نود و سه گروه تکراری با اندازه‌های متفاوت (۵، ۴، ۳ عضوی) در مرورگر
  واقعی اجرا شد — قبل از Run Deduplicate، Overview عدد `9` را نشان داد (`4+3+2`، نه
  فرمول قدیمیِ `12`)؛ بعد از Run Deduplicate واقعی، Total از ۳۰ به ۲۱ رسید و پیام
  «Removed 9 nodes» دقیقاً با همان عدد از قبل نمایش‌داده‌شده مطابقت داشت.

- **کامپوننت مشترک جدید: دکمه‌ی شناور Scroll-to-Top/Bottom (۲۰۲۶-۰۷-۰۷).**
  `ui/components/scroll-fab.tsx` — یک دکمه‌ی واحد، ثابت در گوشه‌ی پایین-چپ فیزیکی صفحه
  (هم LTR هم RTL، بدون آینه‌شدن)، که جهت فلش را بر اساس موقعیت Scroll (نسبت به نصف
  `scrollHeight - viewportHeight`) بین بالا/پایین عوض می‌کند، با `scrollTo({behavior})`
  و احترام به `prefers-reduced-motion`، و وقتی صفحه اصلاً Scroll نمی‌خورد اصلاً رندر
  نمی‌شود. مثل `ui/components/nav.tsx`، فقط **یک‌بار** در Shell مشترک (`ui/main.tsx`)
  کنار `<AppNav>` مانت شده — نه در هر ۸ صفحه جداگانه — چون همه‌ی صفحه‌ها همان یک
  `<div>` مشترک را برای Scroll واقعی صفحه به اشتراک می‌گذارند. تأیید بصری واقعی روی
  دسکتاپ (۱۲۸۰px) و موبایل (۳۹۰px)، هر دو با Import واقعی ۳۰۰ نود در Subscription
  Center: جهت فلش در بالای صفحه ↓ و در پایین صفحه ↑ است، کلیک واقعاً اسکرول می‌کند، و
  در صفحه‌ی کوتاه (Settings) دکمه اصلاً در DOM نیست. تست رگرسیون در
  `tests/e2e/scroll-fab.spec.js`.

- **بررسی و تنظیم نهایی بلر دکمه‌ی Scroll FAB (۲۰۲۶-۰۷-۰۷).** کاربر با اسکرین‌شات واقعی
  نشان داد که دکمه در عمل شبیه یک دیسک تو‌پُر به نظر می‌رسد. بررسی با `elementFromPoint`
  در کل بازه‌ی Scroll نشان داد که با `left: 20px`، بیشتر جعبه‌ی ۴۸px دکمه داخل حاشیه‌ی
  بیرونی صفحه (`body { padding-inline: 36px }`) و Padding داخلیِ Panel می‌افتد — یعنی
  محتوای واقعی (متن/بج رنگی) به‌ندرت درست زیرش قرار می‌گیرد. یک تغییر موضع به
  `left: 56px` امتحان و با کاربر هماهنگ نشده بود؛ به‌درخواست صریح کاربر به `left: 20px`
  برگردانده شد. با بازسازی دقیق سناریوی خودِ کاربر (کارت «Valid Nodes» در Dashboard، در
  `left: 20px`) با اسکرین‌شات واقعی FAB-روشن/FAB-مخفی تأیید شد که این مکانیزم واقعاً کار
  می‌کند: رقم زیر دکمه به‌صورت محو ولی قابل‌تشخیص از پشت دیده می‌شود (تأیید هم با
  `getComputedStyle` هم با مقایسه‌ی بصری واقعی). مقادیر نهایی، طبق چند دور تنظیم مستقیم
  کاربر: `left: 20px` (بدون تغییر موضع)، **Light Mode: Opacity ۰.۴۰**، **Dark Mode:
  Opacity ۰.۸۰**، هر دو با `backdrop-filter: blur(16px) saturate(160%)` — یعنی دقیقاً
  همان فرمول هدر Sticky (`.table-scroll--virtual .data-table th`).

- **بازطراحی کامل «Liquid Glass v2» از روی Handoff طراحی Claude Design (۲۰۲۶-۰۷-۰۹).**
  مرجع: `docs/design/design_handoff_unct_liquid_glass/README.md` (+ دو HTML پروتوتایپ مرجع).
  فقط لایه‌ی بصری — هیچ Selector/Store/منطق صفحه‌ای تغییر نکرد. اجزای اصلی:
  - **توکن‌ها:** جدول کامل توکن‌های تم تاریک (پیش‌فرض) و روشن به
    `assets/css/theme.css` منتقل شد، طبق قانون کلیدی Handoff **بدون تغییر نام متغیرهای
    `--unct-*` موجود** — فقط مقدارها به مقادیر طراحی به‌روزرسانی شد و توکن‌های جدید هم با
    همان پیشوند اضافه شدند (`--unct-glass*`، `--unct-ok/warn/err/info/purp` با سه‌گانه‌ی
    `-bg/-bd`، `--unct-acc1/2/soft/bd/txt`، `--unct-pill-*`، `--unct-ring-*`،
    `--unct-track/code/divider/shadow/grad`). نام‌های قدیمی برند (`--unct-purple/pink/...`)
    به شتاب‌رنگ‌های جدید Re-point شدند تا همه‌ی گرادیان‌های موجود خودبه‌خود گرادیان برند
    `#8B5CF6→#0EA5E9` شوند.
  - **فونت‌ها (آفلاین-اول):** Vazirmatn (وزن‌های ۴۰۰–۸۰۰، دو Subset عربی+لاتین با
    `unicode-range`) و JetBrains Mono (۴۰۰–۷۰۰) به‌صورت Self-hosted در `assets/fonts/`؛
    فایل‌های Plus Jakarta Sans قبلی حذف شدند. هیچ فراخوان CDN در Runtime وجود ندارد.
  - **کروم برنامه:** ناوبری بالایی به Pill شناور مرکزی با لوگوی Lockup + ۸ Pill + دکمه‌های
    فوری زبان/تم (همان اکشن‌های `settingsStore`ی صفحه‌ی تنظیمات)؛ Splash Screen برند با
    Loading Bar انیمیت‌شده (۱.۶ ثانیه، فقط بار اول لود)؛ Badge «آفلاین» پایین همه‌ی صفحات؛
    Recipe شیشه‌ی امضای طراحی (`blur(30px) saturate(180%)` + Highlight داخلی) روی
    `.glass-panel` و مشتقاتش.
  - **ریسپانسیو ۷۶۰px:** زیر Breakpoint، نوار Pillها مخفی و **Dock شیشه‌ای شناور** پایین
    صفحه (۴ بخش اصلی + «بیشتر») جایگزین می‌شود؛ «بیشتر» یک **Bottom Sheet شیشه‌ای** با هر
    ۸ بخش در Grid دو ستونه باز می‌کند (رندر شرطی با `matchMedia`، نه فقط CSS، تا نام‌های
    دکمه‌ها در درخت دسترسی Desktop تکراری نشوند — سه تست e2e موبایل هم به Helper جدید
    `tests/e2e/helpers/nav.js` مهاجرت کردند که مسیر واقعی کاربر موبایل را می‌رود).
  - **قانون LTR کد:** طبق Handoff، محتوای کد/URI/لاگ همیشه `direction: ltr` است حتی در
    UI فارسی (`.code-textarea` اصلاح شد).
  - **تأیید بصری واقعی:** ماتریس کامل ۸ صفحه × ۲ تم × ۲ زبان × ۲ فرم‌فکتور (۶۴ اسکرین‌شات
    Playwright از build واقعی، سوئیچ تم/زبان از خود Toggleهای جدید ناوبری) گرفته و با
    پروتوتایپ مرجع مقایسه شد؛ به‌علاوه اسکرین‌شات جدای Sheet «بیشتر» موبایل. `typecheck`،
    ۱۲۵۳ تست واحد، `build` و هر ۵۴ تست e2e سبز.

- **Settings — سه توگل رفتاری (ADR-030، ۲۰۲۶-۰۷-۰۹).** تصمیم‌های Owner در
  `docs/adr/ADR-030-SETTINGS-BEHAVIORAL-TOGGLES.md` (Full ADR) ثبت و پیاده شدند:
  - **Strict Validation** (پیش‌فرض خاموش): نودهایی که برچسب Warning اعتبارسنجی می‌گیرند
    وقتی توگل روشن است `Rejected` نشان داده می‌شوند، ولی هیچ‌وقت از مجموعه حذف نمی‌شوند
    (برگشت‌پذیر، بدون Re-parse). «نداشتن TLS» به‌تنهایی هرگز Warning نیست — فقط
    ناسازگاری واقعی (مثل `security=tls` بدون SNI) هست.
  - **Auto-repair** (پیش‌فرض روشن = رفتار فعلی): وقتی خاموش است، نودی که از مسیر
    `recover()` عبور کرده به‌جای `Valid`، `Warning` نشان داده می‌شود — هیچ منطق
    Recovery واقعی تغییر نمی‌کند، فقط برچسب نمایشی.
  - **Deduplicate on import** (پیش‌فرض روشن — تنها تغییر پیش‌فرض مصوب): Parse در Converter
    Screen حالا به‌صورت پیش‌فرض نودهای یکسان را با همان منطق دکمه‌ی دستی Deduplicate ادغام
    می‌کند؛ Merge جدای Subscription Center عمداً خارج از این Scope ماند (تصمیم مستقل
    قبلی خودش).
  - هر سه توگل یک لایه‌ی خالص و برگشت‌پذیر (`core/validator/derive-status.js#deriveNodeStatus`)
    روی داده‌ای هستند که Validation Engine/Recovery Strategy از قبل محاسبه کرده‌اند — صفر
    منطق جدید در Parser/Validator، صفر ریسک از‌دست‌رفتن داده.
  - **ردیف Telemetry از طراحی حذف شد** (تصمیم Owner) — پیام حریم خصوصی همان Badge
    «آفلاین» پایین صفحه است.
  - **Wipe Data**: دکمه‌ی قرمز با تأیید دومرحله‌ای (`confirm()` بومی، بدون Dependency
    جدید) که `core/storage/wipe.js#wipeAllAppData()` را صدا می‌زند — هر دو دیتابیس
    IndexedDB (`unct-storage`, `unct-templates`) و کل LocalStorage با پیشوند `unct:` را
    پاک و صفحه را Reload می‌کند.
  - UI طبق پروتوتایپ Handoff: سه ردیف توگل با آیکون (`ic-shield`/`ic-speed`/`ic-network`)
    + ردیف Data، با `.settings-row`/`.toggle-switch` جدید در `theme.css`.
  - **تست**: ۲۰ تست واحد جدید (`derive-status.test.js` ۱۳تا + `wipe.test.js` ۳تا + ۹تای
    اصلاح‌شده در `settings-state.test.js`) + ۴ تست e2e واقعی
    (`settings-behavioral-toggles.spec.js`) که هر توگل و Wipe Data را از مسیر واقعی
    کاربر امتحان می‌کنند. دو تست e2e قدیمی (`scroll-fab.spec.js`،
    `subscription-summary.spec.js`) به رفتار جدید مستند به‌روزرسانی شدند — یکی چون
    Settings دیگر صفحه‌ی کوتاه نیست (۴ ردیف جدید اضافه شد)، دیگری چون فیکسچرش عمداً
    به Dedup-on-import خاموش نیاز داشت. `typecheck`، ۱۲۷۷ تست واحد، `build` و هر ۵۸
    تست e2e سبز.

- **هدر موبایل — حذف قاب شیشه‌ای دور لوگو/توگل‌ها (۲۰۲۶-۰۷-۱۰).** زیر Breakpoint ۷۶۰px،
  نوار بالای صفحه دیگر فقط لوگو + دو دکمه‌ی سریع زبان/تم دارد (نوار تب‌ها به Dock پایین
  منتقل شده)؛ نگه‌داشتن کل شیشه‌ی `.glass-panel` دور همین دو دکمه یک کپسول شناور عجیب به
  نظر می‌رسید. اصلاح فقط در `@media (max-width: 760px)` روی `.app-nav` (دسکتاپ دست‌نخورده):
  - `background`/`backdrop-filter`/`border`/`box-shadow` حذف شد — فقط محتوا (لوگو + دکمه‌ها)
    روی پس‌زمینه‌ی صفحه باقی می‌ماند.
  - چیدمان `justify-content: space-between` شد — لوگو در سمت شروع خوانش، دکمه‌ها در سمت
    پایان؛ چون این مقدار خودش جهت‌آگاه است، با فارسی (`dir="rtl"`) بدون هیچ Rule جداگانه‌ای
    آینه می‌شود.
  - دکمه‌های `.app-nav__toggle` به حداقل Touch Target استاندارد ۴۴×۴۴px رسیدند (اندازه‌گیری
    واقعی با `getBoundingClientRect` تأیید شد).
  - **تست**: ۴ تست e2e جدید (`tests/e2e/mobile-header.spec.js`) — حذف شیشه فقط زیر ۷۶۰px
    (دسکتاپ دست‌نخورده تأیید شد)، چیدمان LTR، آینه‌شدن RTL، و اندازه‌ی واقعی دکمه‌ها.
    `typecheck`، ۱۲۷۷ تست واحد، `build` و هر ۶۲ تست e2e سبز.

- **دو باگ بصری هدر موبایل — رفع بعد از تست کاربر واقعی (۲۰۲۶-۰۷-۱۰).**
  1. **دکمه‌ی زبان وسط صفحه بود، نه کنار دکمه‌ی تم**: علتش این بود که `.app-nav` چهار
     فرزند مستقیم داشت (لوگو، [نوار تب‌ها مخفی]، توگل زبان، توگل تم) و
     `justify-content: space-between` فضا را بین همه‌ی آن‌ها پخش می‌کرد، نه فقط بین
     «لوگو» و «بقیه». دو دکمه‌ی توگل حالا در یک `<div class="app-nav__toggles">`
     مشترک قرار گرفتند تا `space-between` فقط بین دو چیز تقسیم شود (دسکتاپ، که خودش
     یک Wrapper اضافه‌ی بی‌اثر گرفته، دست‌نخورده ماند).
  2. **آیکون خورشید در تم روشن مشکی بود، نه طلایی**: کاراکترهای ☀ (U+2600) و ☾ (U+263E)
     طبق یونیکد پیش‌فرض Text-Presentation دارند، ولی خیلی از Font Fallback های اندروید
     همچنان آن‌ها را به‌صورت Emoji رنگی رندر می‌کنند و رنگ CSS (`#E8C56A`) را کلاً
     نادیده می‌گیرند. هر دو کاراکتر حالا با یک `VARIATION SELECTOR-15` (U+FE0E) صریح
     نوشته شده‌اند (`"☀︎"`، `"☾︎"`) تا همه‌جا رندر متنی/رنگ‌پذیر اجباری شود. grep
     سراسری پروژه برای همین الگو (کاراکتر Emoji-مستعد رنگ‌شده با CSS) در Dock موبایل،
     Splash، و Settings انجام شد — هیچ نمونه‌ی دیگری پیدا نشد.
  - **تست**: `tests/e2e/mobile-header.spec.js` با ۲ تست جدید تقویت شد (فاصله‌ی واقعی
    بین دو دکمه در هر دو جهت LTR/RTL، و بررسی کدپوینت `U+FE0E` بعد از هر دو گلیف).
    `typecheck`، ۱۲۷۷ تست واحد، `build` و هر ۶۳ تست e2e سبز.

- **پاکسازی کد مرده‌ی بازمانده از بازطراحی Liquid Glass v2 (۲۰۲۶-۰۷-۱۰).** بررسی سیستماتیک
  کل پروژه (کلاس‌ها/متغیرهای CSS، کلیدهای i18n، Fontها/آیکون‌ها، breakpointها) نسبت به
  کامیت `bfde667` به بعد. اکثر «مشکوک‌به‌مرده» بودن‌ها False Positive از الگوی
  Interpolation پویا بودند (مثل `` `protocol-badge--${protocol}` ``، یا
  `` `common.fields.${status}` ``) — بعد از رد این موارد، فقط این‌ها واقعاً بی‌استفاده
  ثابت شدند و حذف شدند:
  - سه متغیر CSS یتیم در `assets/css/theme.css`: `--unct-mint`، `--unct-danger`
    (هر دو Alias بدون هیچ مصرف‌کننده)، و `--unct-code` (هر دو تعریف تم تیره/روشن).
  - دو کلید i18n یتیم در هر دو دیکشنری (`en.js`+`fa.js`): `common.fields.field` و
    `dashboard.title` — هیچ‌جا با `t()` صدا زده نمی‌شدند.
  - یک کامنت نادرست در `theme.css` که هنوز از Breakpoint قدیمی «۶۶۰px» یاد می‌کرد در
    حالی که Media Query واقعی زیرش `760px` است — به‌روزرسانی شد.
  - **بدون تغییر**: هیچ کلاس CSS، فایل کامپوننت، فونت، یا تست e2e/واحد یتیمی پیدا نشد؛
    سه Asset جدید (`ic-bars.png`، `ic-code.png`، `unct-logo.png`) که در همان کامیت
    بازطراحی اضافه شدند ولی هنوز به هیچ صفحه‌ای وصل نشده‌اند، **حذف نشدند** — طبق
    README خود Handoff (`docs/design/design_handoff_unct_liquid_glass/README.md`)
    عمداً برای صفحات آینده (Console/Analyzer) رزرو شده‌اند، نه بقایای یک ساختار قدیمی.
  - **تست**: `typecheck`، ۱۲۷۷ تست واحد (شامل تست Parity دیکشنری)، `build` و هر ۶۳
    تست e2e سبز — پاکسازی صفر تغییر رفتار ایجاد کرد.

- **باگ تکراری آیکون تم — ریشه‌کنی واقعی (۲۰۲۶-۰۷-۱۰).** کاربر با تست واقعی دستگاه گزارش
  داد آیکون ☀/☾ بعد از **اولین تعویض تم** روی موبایل و دسکتاپ هر دو مشکی می‌شود، با اینکه
  فیکس قبلی (کامیت `b743296`، افزودن U+FE0E) هنوز سالم بود. طبق `systematic-debugging`، اول
  Reproduce شد: با Playwright واقعی رنگ محاسبه‌شده‌ی دکمه قبل/بعد از کلیک اندازه‌گیری شد.
  فرضیه‌ی اول کاربر (subset فونت Vazirmatn + font-display:swap باعث fallback به فونت ایموجی
  می‌شود) **رد شد** — ریشه‌ی واقعی یک تناقض Specificity در CSS بود:
  `.app-nav__toggle:hover { color: var(--unct-text); }` (دو Class Selector، Specificity
  0,2,0) روی `.app-nav__toggle--theme { color: #E8C56A; }` (یک Class، 0,1,0) همیشه برنده
  می‌شد — و نگه‌داشتن ماوس روی دکمه بعد از کلیک (دسکتاپ) یا پدیده‌ی "sticky hover" بعد از لمس
  (خیلی از مرورگرهای موبایل) دقیقاً یعنی state=`:hover`، پس این باگ از همان اولین تعویض روی
  هر دو پلتفرم رخ می‌داد.
  - **فیکس ساختاری**: گلیف یونیکد ☀/☾ کاملاً حذف شد؛ آیکون تم اکنون یک SVG درون‌خطی
    (`ThemeIcon` در `ui/components/nav.tsx`, بر پایه‌ی Feather Icons با مجوز MIT) با
    `stroke="#E8C56A"` — یک Attribute واقعی SVG، نه ملک CSS `color` — است، پس هیچ Rule
    `:hover` یا Fallback فونتی دیگر نمی‌تواند رویش اثر بگذارد.
  - **Scope-check**: تنها گلیف رنگ‌شده‌ی دیگر در پروژه (✨ در `dashboard.hero.titleReady`)
    بررسی و امن تشخیص داده شد — Emoji تزئینی با Presentation پیش‌فرض رنگی است، هیچ Override
    رنگ CSS روی آن اعمال نشده، پس در معرض همین باگ نیست.
  - **تست ضد-بازگشت جدید**: تست قبلی فقط Codepoint متن را می‌سنجید (که حتی با باگ فعال هم
    سبز می‌ماند). تست جدید در `tests/e2e/mobile-header.spec.js` واقعاً دکمه را کلیک می‌کند
    (که هم تعویض تم و هم حالت `:hover` واقعی را همزمان ایجاد می‌کند) و رنگ `stroke`
    محاسبه‌شده‌ی SVG را می‌سنجد — روی موبایل و دسکتاپ هر دو.
  - **تأیید**: اسکرین‌شات واقعی بعد از تعویض تم و در حالت Hover، برای هر ۴ ترکیب
    (موبایل/دسکتاپ × en/fa) — آیکون طلایی می‌ماند. `typecheck`، ۱۲۷۷ تست واحد، `build`،
    و هر ۶۴ تست e2e سبز.

---

## گام بعدی واقعی

**دیگر هیچ کار ناتمام شناخته‌شده‌ای در کل پروژه باقی نمانده.** فاز نهایی طراحی بصری، فاز
i18n/RTL، Custom Parser/Export API، Extractor Level System، `riskScore` (doc06 §3 / ADR-027)،
Alternative Candidates (ADR-028)، و در نهایت هر ۴ فیچر Subscription Center که «نیاز به معماری
واقعاً جدید» داشتند — Deduplicate Nodes، Split Subscription، Tag Nodes، و **Merge Subscription**
(آخرین مورد) — همگی با پیاده‌سازی واقعی، تست واحد/E2E واقعی، و اسکرین‌شات واقعی Playwright
تأیید و بسته شدند. پس از آن، یک کرش بحرانی واقعی (Subscription Center با ۵۰۰۰+ نود) با داده‌ی
واقعی کاربر کشف و همان روز رفع شد — Virtual List (ADR-029؛ فهرست کامل در بند «اصلاحات اخیر»
بالاتر).

آنچه در «محدودیت‌های شناخته‌شده» بالا باقی مانده (Drag-Drop بدون E2E، حذف کامل گروه
Visualization، مسیر جدای Export Center) همگی تصمیم‌های Scope مستند و آگاهانه‌اند — نه Blocker،
نه کار ناتمام؛ جزئیات دقیق همان‌جا.
