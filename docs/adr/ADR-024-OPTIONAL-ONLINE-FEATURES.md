# ADR-024 — Optional Online Features (Opt-In, User-Initiated)

**Status:** Accepted  
**Date:** 2026-06-30  
**Authors:** UNCT team  
**Scope:** Full ADR — تغییر در یک Core Principle بنیادین (doc 01 §2)

---

## Context

### وضعیت قبلی

سند ۰۱ §۲ اصل **Offline First** را به‌صورت مطلق بیان کرده بود — بدون هیچ استثنا. این رویکرد
برای Pipeline اصلی (Parser→UNM→Analyzer→Converter) کاملاً صحیح و باید دائمی بماند.

اما در Phase 12 (P12-10)، قابلیت‌هایی مثل **Latency Tester** مطرح شدند که ذاتاً نیاز به
اتصال شبکه دارند — نه برای Pipeline اصلی، بلکه به‌عنوان یک ابزار جانبی و اختیاری که کاربر
با یک کلیک صریح فعال می‌کند.

### چرا این تغییر منطقی است

ده‌ها ابزار مشابه در وب وجود دارند که «آفلاین اول» هستند ولی یک دکمه‌ی «Test Connection» یا
«Check Latency» دارند — مثل:
- ابزارهای مدیریت کانفیگ VPN که Ping به سرور می‌زنند
- DNS Checkerهایی که یک Lookup واقعی انجام می‌دهند
- Port Scannerهایی که یک TCP Connect امتحان می‌کنند

هیچ‌کدام از اینها با «Offline First» تضاد ندارند، چون **Pipeline اصلی** آن‌ها آفلاین است و
قابلیت شبکه فقط یک افزونه‌ی اختیاری و کاربر-محور است.

پیش‌شرط اصلی ADR جداگانه برای مرزبندی این قابلیت‌ها (که در Backlog P12-10 ثبت شده بود) به
این ADR عمومی منتقل شده — یعنی هر قابلیت آنلاین آینده که از قوانین زیر پیروی کند، نیازی به
ADR جداگانه ندارد.

---

## Decision

### قوانین سه‌گانه‌ی ثابت برای هر قابلیت آنلاین

| # | قانون | توضیح |
|---|---|---|
| **1** | **User-Initiated Only** | هیچ اتصال شبکه‌ای خودکار/پس‌زمینه مجاز نیست. هر درخواست شبکه باید نتیجه‌ی یک Action صریح از کاربر (کلیک، submit) باشد — نه چیزی که موقع Parse، Import، یا بارگذاری اپ خودکار اجرا شود. |
| **2** | **Data Minimization — No Credentials** | هرگز داده‌ی حساس ارسال نمی‌شود: `uuid`, `password`, `privateKey`, `publicKey` (WireGuard), `pbk`, `sid`, `psk`، یا هر مشتق کلیدرمزنگاری. فقط `address` و `port` (که در خود کانفیگ هم public-ish هستند) مجازند. |
| **3** | **Architectural Separation** | کد هر قابلیت آنلاین در `core/network/` قرار می‌گیرد — کاملاً مجزا از `core/parser/`, `core/analyzer/`, `core/converter/`. Pipeline اصلی هرگز به `core/network/` import نمی‌کند. |

### آنچه تغییر می‌کند

اصل Offline First از «مطلق» به «پیش‌فرض با استثنای صریح و کنترل‌شده» تبدیل می‌شود:

- **Pipeline اصلی:** همیشه و بدون استثنا آفلاین می‌ماند. این قانون مطلق است.
- **قابلیت‌های جانبی:** می‌توانند Opt-In و User-Initiated باشند، با رعایت قوانین سه‌گانه‌ی بالا.

### آنچه تغییر نمی‌کند

- **Non-Goals §7 سند ۰۱** کاملاً دست‌نخورده می‌ماند: UNCT هرگز VPN Client، Proxy Client،
  Tunnel Software، Traffic Forwarder، Packet Sniffer، یا Real-Time Connection Engine نمی‌شود.
- **مرز تفسیری:** یک TCP connect لحظه‌ای برای اندازه‌گیری latency با *برقراری و نگه‌داشتن
  یک تونل پروکسی فعال* یک چیز نیست. اولی ابزار تشخیصی است؛ دومی یک Proxy Client که در
  Non-Goals ثبت شده.

---

## Consequences

### قابلیت‌هایی که از این به بعد بدون ADR جداگانه مجاز هستند

هر قابلیتی که قوانین سه‌گانه‌ی بالا را رعایت کند:

| قابلیت | داده‌ی ارسالی | User-Initiated | مجاز؟ |
|---|---|---|---|
| Latency Tester (P12-10) | فقط address:port | ✓ دکمه‌ی صریح | ✓ بله |
| GeoIP Inspector | فقط address | ✓ دکمه‌ی صریح | ✓ بله (API خارجی) |
| Port Availability Check | فقط address:port | ✓ دکمه‌ی صریح | ✓ بله |
| اتصال خودکار موقع Import | هر چیزی | ✗ خودکار | ✗ خیر |
| ارسال uuid/password به سرور | Credential | ✓ یا ✗ | ✗ خیر |
| تونل پروکسی فعال | Credential + ترافیک | ✓ یا ✗ | ✗ خیر (Non-Goal §7) |

### Data Minimization به‌عنوان قانون دائمی

قانون Data Minimization (فقط address+port) ثابت و بدون استثناست. حتی اگر یک قابلیت آینده
«نیاز» به credential داشته باشد، این قابلیت خارج از محدوده‌ی UNCT است.

### معماری `core/network/`

این دایرکتوری برای آینده رزرو شده است. در این مرحله (ADR-024) هیچ کدی نوشته نمی‌شود —
فقط مرزبندی معماری ثبت می‌شود تا توسعه‌دهنده‌های آینده جای کد را بدانند.

---

## Addendum — Architecture Guard & No-Artificial-Limiting Rule

### اجرای مکانیکی (Architecture Guard Test)

قانون سه‌گانه‌ی بالا — به‌ویژه Architectural Separation — به‌صورت خودکار اجرا می‌شود.
فایل `tests/architecture/no-network-in-core-pipeline.test.js` تمام فایل‌های `.js` در
پوشه‌های زیر را اسکن می‌کند:

```
core/parser/
core/analyzer/
core/converter/
core/validator/
core/unm/
```

و شکست می‌خورد اگر هر کدام شامل موارد زیر باشد:

| Pattern | توضیح |
|---|---|
| `fetch(` | Fetch API — هر نوع درخواست شبکه |
| `XMLHttpRequest` | XHR — هر نوع درخواست شبکه |
| `from "…/network/…"` | import از `core/network/` (ماژول قابلیت‌های آنلاین) |

این تست به‌عنوان بخشی از CI اجرا می‌شود. هر Commit که Pipeline اصلی را آلوده کند،
قبل از Merge رد می‌شود.

**چطور یک قابلیت آنلاین درست پیاده‌سازی شود:**
کد شبکه → `core/network/` ← فقط UI Layer (action صریح کاربر) صدا می‌زند.
هرگز Parser/Analyzer/Converter/Validator به `core/network/` import نمی‌کند.

### قانون «بدون محدودیت مصنوعی»

قابلیت‌هایی که سه قانون بالا را رعایت کنند و توسط کاربر فعال می‌شوند باید **به‌درستی و بدون
کاهش عمدی کیفیت** اجرا شوند. هیچ‌یک از موارد زیر برای قابلیت‌های مجاز مجاز نیست:

| اقدام ممنوع | دلیل |
|---|---|
| اضافه کردن Confirmation Dialog اضافی بعد از کلیک کاربر | کاربر یک‌بار opt-in کرده؛ دوباره پرسیدن تجربه را خراب می‌کند |
| Timeout کوتاه مصنوعی (کمتر از ۵ ثانیه) برای Latency Test | مقدار اندازه‌گیری‌شده باید واقعی باشد |
| پنهان کردن نتیجه یا نمایش پیغام هشدار بی‌مورد | اگر کاربر صریح کلیک کرده، نتیجه باید مستقیم نمایش داده شود |
| محدود کردن تعداد تست همزمان به شکل غیرفنی | اگر محدودیت فنی ندارد، مصنوعی نباشد |

**خلاصه:** قوانین سه‌گانه مرز را تعریف می‌کنند. داخل آن مرز، قابلیت باید به‌اندازه‌ی نیاز و
بدون دست‌وپاگیری اضافی کار کند.

---

## References

- سند ۰۱ §۲ (Core Principles — Offline First، اصلاح‌شده در v1.3)
- سند ۰۱ §۷ (Non-Goals — بدون تغییر، با یادداشت تفسیری)
- ULTIMATE_BLUEPRINT_INDEX.md v2.3 (Backlog Latency Tester به‌روز شد)
- P12-10 (Latency Tester — آیتم Tier 2، پیش‌شرط ADR جداگانه حذف شد)
- `tests/architecture/no-network-in-core-pipeline.test.js` (Architecture Guard)
