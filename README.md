# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

## وضعیت پروژه

✅ **Architecture Baseline** — تمام ۱۹ بلوپرینت معماری در `docs/blueprints/` نوشته و دو دور بازبینی شده‌اند.
🚧 **Phase 1 (Foundation Layer)** — در حال انجام. لایه‌های زیر ساخته و تست شده‌اند:
- **UNM** (`core/types/`, `core/unm/`) — Schema، Enumها، Factory با Immutability/Invariants (طبق سند 05 و ADR-002).
- **Validation Engine** (`core/validator/`) — اعتبارسنجی Node-by-Node با Cross-Field (طبق Stage 13). پوشش تست > ۹۵٪.
- **Error Code Registry** (`core/errors/`) — رجیستری مرکزی کدهای خطا با سطوح INFO/WARNING/ERROR/CRITICAL.
- **Normalization Mapping Table** (`core/unm/mapper/`) — نگاشت مقدار خام به Enum استاندارد (Stage 13.1).
- **Testing Infrastructure** — Vitest (dev-only، طبق ADR-005)، `tsc --noEmit` برای Type-Check.
- **Foundation Acceptance Gate** (`tests/baseline-dataset/`) — در سطح UNM/Validation فعال است.

> تصمیم Build-Path (Zero-Build در برابر Build-Step) دوباره بررسی و **Zero-Build موکول‌مانده** تأیید شد — ADR-005 بدون تغییر معتبر است. Parserها و دیتاست خام ۱۰۰تایی به Phase 2/3 موکول‌اند — دلیل و دامنه‌ی دقیق در `docs/adr/ADR-006-PHASE1-GATE-SCOPE.md` ثبت شده (جزئیات اجرایی در `tests/baseline-dataset/README.md`).

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

تکمیل Foundation Acceptance Gate در سطح خام (نیازمند Parserها) و سپس Phase 2 (Parser Infrastructure / Factory) طبق `09-DEVELOPMENT_ROADMAP.md`. دیتاست خام ۱۰۰تایی و تست Recovery همراه با Parserها اضافه می‌شوند.
