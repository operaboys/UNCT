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
  استخراج ساختاری از `outbounds[].settings.vnext/servers` (تفکیک DNS از Server Address)، نگاشت مقدار
  (Stage 13.1) و نگاشت نام با Priority Chain (مثل `publicKey`→`pbk`، ثبت در `originalMappings`)، و
  Recovery مرحله‌ی 10/11 (ترمیم JSON خراب + Fuzzy Key با Levenshtein) — با قانون مطلق «هرگز
  uuid/password/pbk/sid را Invent نکن». VLESS/VMESS/Trojan/Shadowsocks با TLS/Reality/WS/gRPC.
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
- **Helperهای اشتراکی Parser** (`core/parser/shared/`) — `resolvePriority` (Priority Chain)،
  `levenshtein/fuzzyKey/fuzzyMatch`، و `buildWireguardExtensions` (ADR-007)؛ جدول نگاشت از
  `core/unm/mapper/` بازاستفاده می‌شود نه بازنویسی.

> تصمیم Build-Path (Zero-Build در برابر Build-Step) همچنان **Zero-Build موکول‌مانده** است — ADR-005
> بدون تغییر معتبر است.

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

## یک تصمیم باز (مهم)

تنش معماری بین «Single HTML Output / No Build Step» و نیازهای واقعی پروژه هنوز حل نشده (در `IMPLEMENTATION_BLUEPRINT.md` مستند شده). **قبل از تنظیم هرگونه Bundler یا ساختار Build، از مهدی بپرس**، خودسرانه تصمیم نگیر. برای توسعه‌ی فعلی، فرض بر Native ES Modules بدون Bundler است.

## گام بعدی

Parserهای Phase 4 (**Sing-box**، **Clash/Clash-Meta**) که به بخش‌های WireGuard هم برخورد می‌کنند و
از قرارداد `extensions.wireguard` (ADR-007) و helperهای اشتراکی استفاده خواهند کرد. سپس دیتاست خام
۱۰۰تایی و گیت کامل Parse→Validation طبق `docs/adr/ADR-006-PHASE1-GATE-SCOPE.md`. هر Parser جدید فقط
با Extend کردن `BaseParser` و ثبت در `ParserFactory` اضافه می‌شود، بدون تغییر Parserهای موجود (سند 12 §6).
