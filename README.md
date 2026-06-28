# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

## وضعیت پروژه

✅ **Phase 1 (Foundation Layer)** — کامل. UNM (`core/types/`, `core/unm/`) با Immutability/Invariants
(سند 05، ADR-002)، Validation Engine Node-by-Node با Cross-Field (`core/validator/`, Stage 13، پوشش
تست > ۹۵٪)، Error Code Registry (`core/errors/`)، Normalization Mapping Table (`core/unm/mapper/`،
Stage 13.1)، Testing Infrastructure (Vitest dev-only طبق ADR-005، `tsc --noEmit`)، و Foundation
Acceptance Gate در سطح UNM/Validation (`tests/baseline-dataset/`، دامنه‌ی دقیق در
`docs/adr/ADR-006-PHASE1-GATE-SCOPE.md`). نسخه‌ی Schema جداگانه از نسخه‌ی سند است: `UNM_SCHEMA_VERSION`
در `core/unm/registry/schema-registry.js`.

🚧 **Phase 2 (Parser Infrastructure)** — در حال انجام. تا اینجا:
- **BaseParser Contract** (`core/types/parser.d.ts` + اجرای Runtime در `core/parser/base/`) — پنج متد
  الزامی (`detect`/`parse`/`validateStructure`/`normalize`/`recover`) و دو فیلد رزروشده
  (`isAsync?`/`parseAsync?` برای Plugin Parsers آینده، Phase 11)، طبق سند 12 §2.
- **ParserFactory** (`core/parser/factory.js`) — ثبت Parser، Confidence Scoring (Highest Confidence
  Wins، آستانه‌ی Unknown Format = ۵۰٪)، و زنجیره‌ی Fallback (Primary → Secondary → ...) طبق سند 12
  §4/§5.
- **Xray Parser** (`core/parser/xray/`، Priority: Highest، سند 04 Stage 04) — تشخیص Xray JSON،
  استخراج ساختاری از `outbounds[].settings.vnext/servers` (تفکیک DNS از Server Address). **چندنودی**
  (`producesMany`/`normalizeMany`، ADR-008): هم **Multi-Outbound** هم **Multi-User** (هر User در
  `vnext[].users[]` یک نود جدا) — جلوگیری از Data Loss (قانون ۹). نگاشت مقدار (Stage 13.1) و نام با
  Priority Chain (مثل `publicKey`→`pbk`، ثبت در `originalMappings`)؛ Recovery مرحله‌ی 10/11 (ترمیم JSON
  خراب + Fuzzy Key با Levenshtein) — با قانون مطلق «هرگز uuid/password/pbk/sid را Invent نکن».
- **URL Parser** (`core/parser/url/`، سند 04 Stage 07) — اسکیم‌های
  `vless/vmess/trojan/ss/hysteria2(hy2)/tuic/wireguard`. شامل لایه‌ی مجزای **Stage 12 — URL
  Preprocessing** (`preprocess.js`؛ Escape/Normalize/Validate، با محافظت از Username/Password/UUID/
  Path/Query)، رمزگشایی Base64 (vmess JSON، ss SIP002/legacy)، و Recovery مرحله‌ی 10/11 (Fuzzy Scheme
  + پاک‌سازی Base64). کلیدهای WireGuard در `extensions` می‌نشینند (UNM Freeze دست‌نخورده).
- **Subscription Parser** (`core/parser/subscription/`، سند 04 Stage 08) — ورودی Base64/TXT/Mixed،
  با Auto Decode/Split/Deduplicate/Validate/Normalize. **بازاستفاده‌ی صریح از URL Parser** برای هر خط
  (نه بازنویسی). Subscription Validation (تشخیص Empty/Broken-Base64/Duplicate) **قبل از** Split/Merge
  اجرا می‌شود (سند 03 §2.1). خروجی N نود: با `producesMany=true` و `normalizeMany` (ADR-008)؛
  `normalize` تک‌نودی عمداً **خطای بلند** می‌دهد تا Silent Data Loss رخ ندهد (قانون ۹ ANTI_CHAOS).
  مصرف‌کننده‌ها از `normalizeAll(parser, extraction)` فکتوری استفاده می‌کنند.
- **Sing-box Parser** (`core/parser/singbox/`، سند 04 Stage 05) — کانفیگ JSON با آرایه‌ی
  `outbounds`/`endpoints`؛ اولین پارسر واقعیِ **چندنودی** (`producesMany`/`normalizeMany`، ADR-008).
  نام‌های snake_case مخصوص sing-box (`server`/`server_port`/`type`، `tls.reality.public_key`، …) با
  Priority Chain خودش به فیلدهای Canonical نگاشت می‌شوند؛ `security` از `tls.enabled`/`reality.enabled`
  استنتاج می‌شود؛ WireGuard در `extensions.wireguard` (ADR-007). از Xray با نام فیلدها تفکیک می‌شود
  (`type` در برابر `protocol`) تا Confidence تصادم نکند.
- **Clash / Clash.Meta Parser** (`core/parser/clash/`، سند 04 Stage 06) — کانفیگ YAML با آرایه‌ی
  `proxies`؛ چندنودی (ADR-008). از `js-yaml` برای Decode استفاده می‌کند (سند 14 §5: بدون Parser
  سفارشی YAML). نام‌های kebab-case کلش (`client-fingerprint`، `reality-opts.public-key`، `ws-opts`، …)
  با Priority Chain خودش نگاشت می‌شوند؛ `security` از `tls`/`reality-opts` و TLS-native بودن پروتکل
  استنتاج می‌شود؛ `sourceType` بین `clash-yaml`/`clash-meta-yaml` تفکیک می‌شود. چون YAML است (نه JSON
  معتبر)، Confidence با Xray/Sing-box تصادم نمی‌کند.
- **WireGuard Parser** (`core/parser/wireguard/`، سند 04 Stage 09) — فرمت متنی wg-quick
  (`[Interface]`/`[Peer]`). چندنودی (ADR-008): یک کانفیگ می‌تواند چند `[Peer]` داشته باشد → چند نود،
  با فیلدهای مشترک `[Interface]` روی همه. استخراج PrivateKey/PublicKey/Endpoint/AllowedIPs/DNS/MTU/
  PersistentKeepalive؛ Endpoint به address/port هسته تبدیل و بقیه در `extensions.wireguard` با **همان
  helper مشترک `buildWireguardExtensions` (ADR-007)** که Sing-box/Clash/URL استفاده می‌کنند — کلیدها
  عیناً یکسان. Recovery: تصحیح Fuzzy نام سکشن‌ها (هرگز کلید Invent نمی‌شود).
- **Helperهای اشتراکی Parser** (`core/parser/shared/`) — `resolvePriority` (Priority Chain)،
  `levenshtein/fuzzyKey/fuzzyMatch`، `buildWireguardExtensions` (ADR-007)، `repairJson`، و
  `splitHostPort`؛ جدول نگاشت از `core/unm/mapper/` بازاستفاده می‌شود نه بازنویسی.

> تصمیم Build-Path (Zero-Build در برابر Build-Step) همچنان **Zero-Build موکول‌مانده** است — ADR-005
> بدون تغییر معتبر است. **`js-yaml`** اولین وابستگی Runtime پروژه است (تأییدشده در سند 14 §5، حجم ~۴۴KB
> minified — زیر سقف ۱۵۰KB سند 14 §2.1)؛ نحوه‌ی تحویل ESM/مرورگری آن بخشی از همان ADR بسته‌بندیِ موکول است.

### دستورها (dev-only)

```
npm install          # نصب ابزار توسعه (اپ خودش Zero-Build/استاتیک می‌ماند)
npm test             # اجرای کل تست‌ها (Vitest)
npm run typecheck    # بررسی تایپ بدون خروجی (tsc --noEmit)
npm run test:coverage
```

## قبل از هر کد: بخوان

به ترتیب این فایل‌ها را در `docs/blueprints/` بخوان:

1. `01-MASTER_BLUEPRINT.md`
2. `ANTI_CHAOS_BLUEPRINT.md`
3. `MASTER_FILE_STRUCTURE.md`
4. `05-UNIVERSAL_NODE_MODEL.md`
5. `04-PARSER_ENGINE.md`
6. `09-DEVELOPMENT_ROADMAP.md`
7. `15-TESTING_FRAMEWORK.md`

بقیه‌ی اسناد هم برای Context کلی موجودند.

## تصمیم Build Step (حل‌شده)

تنش معماری بین «Single HTML Output / No Build Step» و نیازهای واقعی پروژه با `docs/adr/ADR-014-BUILD-STEP-SCOPED-TO-UI-AND-ASSEMBLY.md` حل شد: یک Build Step محدود (esbuild) فقط برای `ui/` و Assembly نهایی مجاز است؛ `core/` همچنان Zero-Build و JS+JSDoc خام می‌ماند (ADR-005). `npm run build` خروجی را در `assets/js/app.js` می‌سازد (هرگز دستی ویرایش نشود؛ **اصلاح بحرانی
۲۰۲۶-۰۶-۲۸:** این خروجی دیگر Gitignore نیست — برخلاف نسخه‌ی قبلی این جمله، از این پس Commit
می‌شود تا Clone/Download مستقیم ریپو بدون اجرای هیچ دستوری کار کند؛ جزئیات کامل در Addendum
`ADR-014`/`ADR-016`).

## گام بعدی

هر شش Parser (Xray, URL, Subscription, Sing-box, Clash, WireGuard) کامل‌اند — Phase 4 تمام شد.
**Foundation Acceptance Gate در سطح Raw-config هم عبور کرد** (`tests/baseline-dataset/raw-config-gate.test.js`،
طبق `docs/adr/ADR-006-PHASE1-GATE-SCOPE.md`): دیتاست خام ۱۰۰تایی (۵۰ Valid / ۳۰ Partially-Broken /
۲۰ Invalid، پوشش هر ۷ پروتکل و هر ۶ فرمت) از مسیر کامل `Raw → ParserFactory (selectParser + زنجیره‌ی
Fallback §5) → normalizeMany/normalize → applyValidation` عبور داده شد؛ Pass Rate **۱۰۰٪** (Valid
۵۰/۵۰، Broken ۳۰/۳۰ با Recovery، Invalid ۲۰/۲۰ بدون False-Positive).

**شکاف Detection Threshold رفع شد** (`docs/adr/ADR-009-DETECTION-FUZZY-TOLERANCE.md`): اسکیم
URL تایپوشده (`vmes://`) و Base64 ساب‌اسکریپشن کمی‌آلوده هر دو قبلاً در همان مرحله‌ی Detection
رد می‌شدند و `recover()`‌شان هرگز اجرا نمی‌شد. حالا `detectUrl`/`detectSubscription` با تحمل
محدود (`fuzzyMatch` با `maxDist=2` روی نام اسکیم؛ نسبت آلودگی ≤۱۵٪ روی Base64) امتیاز میانی
(۵۵) می‌دهند — بالای آستانه‌ی ۵۰ ولی پایین‌تر از تطبیق دقیق — تا `recover()`‌های موجود
(بدون تغییر در Extract/Normalize) قابل‌دسترس شوند؛ با تست end-to-end از طریق
`parseWithFallback`.

گام بعدی فازهای بعدی Roadmap (Analyzer/Converter/Worker/UI) است. هر Parser جدید فقط با Extend
کردن `BaseParser` و ثبت در `ParserFactory` اضافه می‌شود، بدون تغییر Parserهای موجود (سند 12 §6).
