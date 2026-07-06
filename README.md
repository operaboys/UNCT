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
| 7 | **Settings** | **Theme Engine** (Dark/Light/Auto با همگام‌سازی زنده با OS) **و Language Engine** (English/فارسی/Auto با سوییچ زنده‌ی `dir`/`lang` روی `<html>`، بدون Reload) — هر دو با Radio Card یکسان بازطراحی‌شده، هر دو Persist می‌شوند (`core/storage/local-adapter.js`) |
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
