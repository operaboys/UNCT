# UNCT — Universal Network Config Toolkit

ابزار آفلاین و کلاینت‌ساید برای تبدیل، تحلیل، و مدیریت کانفیگ‌های شبکه (VLESS, VMESS, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard).

## وضعیت پروژه

✅ **Architecture Baseline** — تمام ۱۹ بلوپرینت معماری در `docs/blueprints/` نوشته و دو دور بازبینی شده‌اند.
⏳ **Phase 1 (Foundation Layer)** — هنوز شروع نشده. این مرحله بعدی است.

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

شروع Phase 1 طبق `09-DEVELOPMENT_ROADMAP.md`: ساخت ساختار پوشه (طبق `MASTER_FILE_STRUCTURE.md`)، سپس UNM + Validation Engine.
