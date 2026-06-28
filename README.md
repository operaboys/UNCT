# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

## وضعیت کلی

**Phase 0 تا Phase 9 (طبق `docs/blueprints/09-DEVELOPMENT_ROADMAP.md`) کامل‌اند** — هسته‌ی UNM،
شش Parser، Worker Engine، شش ماژول Analyzer، Converter Engine، Storage Engine (در سطح Core)،
و کل ۸ صفحه‌ی UI به‌همراه Export Engine (هر هفت فرمت سند ۰۸). **Phase 10 تا 12 هنوز شروع
نشده‌اند.** جزئیات دقیق هر فاز و محدودیت‌های واقعی هرکدام در ادامه — از جمله چند مورد که در
سطح Core ساخته شده‌اند ولی هنوز به هیچ صفحه‌ی UI وصل نشده‌اند (بخش «محدودیت‌های شناخته‌شده»).

تست: **۶۲۴ تست در ۵۹ فایل** (Vitest)، همگی Pass؛ `tsc --noEmit` بدون خطا.

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
| Phase 8 — Storage Layer | ✅ کامل | `core/storage/` (IndexedDB Adapter + Node Store) به UI وصل است: نودهای Parser State (`core/store/parser-state.js`) با هر تغییر (`setNodes`/`addNode`/`updateNode`/`clearNodes`) به‌صورت Write-Through در پس‌زمینه در IndexedDB ذخیره می‌شوند و با `hydrate()` روی mount شدن UI بازخوانی می‌شوند — یعنی نودهای Parse‌شده با Refresh/Restart مرورگر از بین نمی‌روند (تأییدشده با تست واقعی روی مرورگر). انتخاب Theme در Settings هم جدا، از طریق `core/storage/local-adapter.js` Persist می‌شود |
| Phase 9 — UI Layer + Export Engine | ✅ کامل (با محدودیت‌های Scope مشخص) | هر ۸ صفحه‌ی اصلی سند ۰۷ ساخته شده؛ Export Engine هر ۷ فرمت سند ۰۸ (TXT, JSON×4, CSV, Clash YAML, ZIP, QR, HTML Report) کامل. جزئیات محدودیت هر صفحه پایین‌تر. معیار «Mobile Optimized» سند ۰۹ تأیید نشده — فقط یک `<meta viewport>` در `index.html` هست، بدون CSS واکنش‌گرا/Media Query (عمداً در کنار Glassmorphism/Theme به فاز نهایی طراحی بصری، انتهای کل Roadmap، موکول شده — تصمیمی قطعی، نه سؤال باز) |
| Phase 10 — Analyzer Extended | ❌ شروع نشده | Cloudflare/Worker/Clean IP/DNS/Subscription/Compatibility Analyzer |
| Phase 11 — Plugin System | ❌ شروع نشده | `plugins/` فقط `.gitkeep` دارد |
| Phase 12 — Advanced/Backlog | ❌ شروع نشده | `reports/` فقط `.gitkeep` دارد |

---

## ۸ صفحه‌ی اصلی (Main Screens)

| # | صفحه | وضعیت واقعی |
|---|---|---|
| 1 | **Dashboard** (صفحه‌ی پیش‌فرض) | Quick Stats، Node Summary، Health Overview، Warnings، و «Recent Imports» همگی واقعی (از Session جاری). «Recent Exports» Placeholder غیرفعال است — هیچ صفحه‌ای هنوز Log فعالیت Export را ثبت نمی‌کند |
| 2 | **Converter** | فقط **Paste Area** (textarea) — File Upload، Drag-Drop، Clipboard Import عمداً Deferred شده‌اند. Parse و Convert هر دو از طریق Worker واقعی انجام می‌شوند (هر دو با Fallback به Main Thread فقط زیر `file://`، طبق ADR-016) |
| 3 | **Analyzer** | ۵ بخش واقعی (Node Details، Protocol، Security+TLS، Compatibility/Network، Reality). «Cloudflare Analysis» Placeholder غیرفعال است (منتظر Phase 10) |
| 4 | **Subscription Center** | Search/Filter (Protocol+Validity)/Sort/Group واقعی. Tag، Merge، Split، Deduplicate Deferred شده‌اند. بدون Virtual List (عمداً، تا داده‌ی واقعی ۱۰,۰۰۰+ نودی برای انتخاب درست کتابخانه موجود شود) |
| 5 | **Extractor** | UUID/IP/Domain/Reality Extractor واقعی. «Worker Extractor» و «DNS Extractor» Placeholder غیرفعال‌اند (وابسته به Phase 10) |
| 6 | **Export Center** | کامل‌ترین صفحه: TXT، Xray JSON، Sing-box JSON، Normalized JSON، Analysis JSON، Clash YAML، CSV، ZIP (+ manifest.json)، QR (هر نود)، HTML Report (Escape + DOMPurify Sanitize، ADR-018)، Clipboard Quick Copy — همگی واقعی |
| 7 | **Settings** | فقط **Theme Engine** (Dark/Light/Auto با همگام‌سازی زنده با OS) — طبق سند ۰۷ §۲ تنها محتوای مستندشده‌ی این صفحه. ظاهر کامل «Cyber Professional / Glassmorphism» سند ۰۷ §۲ هنوز شروع نشده (عمداً به انتهای کل Roadmap موکول شده) |
| 8 | **Developer Console** | ۵ از ۷ بخش سند ۰۷ §۴.۷ واقعی (Parser/Warnings/Errors/Recovery/Validation Logs). «Performance Logs» و نیمه‌ی «Alternative Candidates» Placeholder غیرفعال‌اند — هیچ ماژولی این داده را هنوز ثبت نمی‌کند |

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
npm run build             # بازساخت assets/js/app.js و assets/js/parser-worker.js
```

> بعد از هر تغییر در `ui/` یا `core/worker/parser.worker.js`، حتماً `npm run build` را اجرا و
> خروجی (`assets/js/app.js*`, `assets/js/parser-worker.js*`) را در همان Commit وارد کنید — این
> خروجی Commit می‌شود، نه Gitignore (بخش بعدی).

### قبل از هر کد: بخوان

به ترتیب این فایل‌ها را در `docs/blueprints/` بخوان:

1. `01-MASTER_BLUEPRINT.md`
2. `ANTI_CHAOS_BLUEPRINT.md`
3. `MASTER_FILE_STRUCTURE.md`
4. `05-UNIVERSAL_NODE_MODEL.md`
5. `04-PARSER_ENGINE.md`
6. `09-DEVELOPMENT_ROADMAP.md`
7. `15-TESTING_FRAMEWORK.md`

بقیه‌ی اسناد هم برای Context کلی موجودند؛ تصمیم‌های معماری مهم در `docs/adr/ADR-001` تا
`ADR-018` ثبت شده‌اند.

---

## تصمیم Build Step

تنش معماری بین «Single HTML Output / No Build Step» و نیازهای واقعی پروژه با
`docs/adr/ADR-014-BUILD-STEP-SCOPED-TO-UI-AND-ASSEMBLY.md` حل شد: یک Build Step محدود (esbuild)
فقط برای `ui/` و Assembly نهایی مجاز است؛ `core/` همچنان Zero-Build و JS+JSDoc خام می‌ماند
(ADR-005). `npm run build` خروجی را در `assets/js/app.js` و `assets/js/parser-worker.js` می‌سازد.

**اصلاح بحرانی (۲۰۲۶-۰۶-۲۸):** این خروجی‌ها دیگر Gitignore نیستند — قبلاً بودند، که یعنی هرکس
ریپو را Clone/Download ZIP می‌کرد بدون اجرای `npm run build`، با یک صفحه‌ی غیرکارکننده مواجه
می‌شد؛ این مستقیماً با هدف Offline-First پروژه (Deployment Mode 1) در تناقض بود. از این پس این
چهار فایل Commit می‌شوند (هنوز هرگز دستی ویرایش نمی‌شوند — فقط `npm run build` آن‌ها را
می‌سازد). جزئیات کامل در Addendum انتهای `ADR-014` و `ADR-016`.

---

## محدودیت‌های شناخته‌شده (Known Limitations)

این بخش صادقانه است — هرچیزی که در عمل ساخته نشده یا کامل وصل نیست، اینجاست:

- **`core/importer/` خالی است** (فقط `.gitkeep`) — File Upload و Drag-Drop وجود ندارند؛ تنها راه
  ورودی فعلی، Paste کردن متن در Converter Screen است.
- **`core/worker/converter.worker.js` به Converter Screen وصل است، ولی نه به Export Center** —
  در Converter Screen، هم Parse و هم Convert از طریق Worker واقعی انجام می‌شوند (Fallback به Main
  Thread فقط زیر `file://`، ADR-016). Export Center (`ui/export/export-screen.tsx`) مسیر جدایی
  دارد: مستقیماً `core/exporter/` → `convertBatch` را روی Main Thread صدا می‌زند؛ این یک تصمیم
  Scope جداست (هنوز به این Worker Pool وصل نشده)، نه باگ.
- **طراحی بصری حداقلی است** — فقط دو متغیر CSS (`--unct-bg`/`--unct-fg`) برای Dark/Light/Auto؛
  سیستم کامل «Cyber Professional / Glassmorphism / Neumorphism» سند ۰۷ §۲، و به همراه آن CSS
  واکنش‌گرا/Media Query برای معیار «Mobile Optimized» سند ۰۹ (فعلاً فقط یک `<meta viewport>` در
  `index.html` هست، بدون هیچ `@media`)، عمداً هردو به انتهای کل Roadmap موکول شده‌اند — تصمیمی
  قطعی، نه سؤال باز.
- **`core/normalizer/` و `core/detector/` خالی‌اند** (فقط `.gitkeep`) — این یک محدودیت واقعی
  نیست بلکه یک نتیجه‌ی معماری: منطق Detect/Normalize داخل خود هر Parser (`detect()`/
  `normalize()`/`normalizeMany()`) و `core/unm/mapper/` پیاده شده، نه در ماژول جدا.
- **`plugins/` و `reports/` خالی‌اند** — طبق برنامه، چون Phase 11/12 هنوز شروع نشده‌اند.
- چند بخش از صفحات اصلی Placeholder غیرفعال‌اند (جدول بالا) — همگی به‌خاطر نبود ماژول
  Analyzer نیمه‌قطعی (Phase 10) یا نبود Log/Activity Source، نه باگ.

---

## گام بعدی واقعی

طبق Roadmap، گام بعدی **Phase 10 (Analyzer Engine — Extended Modules: Cloudflare, Worker, Clean
IP, DNS, Subscription, Compatibility Analyzer)** است.
