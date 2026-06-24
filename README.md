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
  §4/§5. هنوز هیچ Parser واقعی (Xray و غیره) ثبت نشده — این Checkpoint فقط Contract + Factory است.

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

اولین Parser واقعی: **Xray Parser** (Priority: Highest، سند 04 Stage 04) به‌همراه Stage 10/11
(Error Recovery + Fuzzy Recovery — هرگز uuid/password/pbk/sid را Invent نکن) و تکمیل Normalization
Mapping Table برای فیلدهای بیشتر. بعد از اولین Parser، دیتاست خام ۱۰۰تایی و گیت کامل
Parse→Validation طبق `docs/adr/ADR-006-PHASE1-GATE-SCOPE.md` اضافه می‌شود.
