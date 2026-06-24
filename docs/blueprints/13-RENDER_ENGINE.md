# BLUEPRINT 13 — RENDER ENGINE (DEPRECATED → MERGED)

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | ⚠️ **DEPRECATED** — جایگزین شده توسط Preact + Virtual List Library |
| **Version** | 2.0 (نسخه‌ی کوچک‌شده) |

---

## چرا این سند منسوخ شد؟

نسخه‌ی اصلی این بلوپرینت توصیف یک **Render Engine کامل و دستی** را می‌داد: Virtual Scrolling سفارشی، DOM Recycling دستی، Incremental Rendering دستی. این دقیقاً همان مسئله‌ای است که Virtual DOM در فریم‌ورک‌هایی مثل Preact حل می‌کند.

| نیاز قبلی | راه‌حل جدید |
|---|---|
| DOM Recycling دستی | Virtual DOM Diffing توکار Preact |
| Incremental Rendering دستی | Re-render خودکار Preact بر اساس تغییر State |
| Virtual Scrolling سفارشی برای ۱۰,۰۰۰+ نود | یک کتابخانه‌ی Virtual List آماده (مثل `preact-window` یا معادل سبک آن) — **این یک مورد است که همچنان باید صریحاً انتخاب و یکپارچه شود، چون Preact خودش این قابلیت را ندارد** |

> ⚠️ **نکته‌ی مهم:** برخلاف State Management (سند 11) که کاملاً توسط Preact حل می‌شود، مسئله‌ی **رندر ۱۰,۰۰۰+ آیتم در یک لیست** هنوز نیاز به یک کتابخانه‌ی مجزا (نه ساخت دستی) دارد. این تفاوت کلیدی است: ما چیزی از صفر نمی‌سازیم، ولی انتخاب کتابخانه و یکپارچه‌سازی آن همچنان یک Task واقعی در Roadmap است (Phase 9).

---

## چه‌چیزی از سند اصلی باقی ماند؟

### Performance Target (هدف، نه پیاده‌سازی)

- موبایل: 60 FPS
- دسکتاپ: 120 FPS Ready
- Subscription Center باید ۱۰,۰۰۰+ نود را بدون لگ نمایش دهد

### Memory Policy (مفهومی، همچنان معتبر)

این قوانین مستقل از فریم‌ورک هستند و باید رعایت شوند تا از Memory Leak جلوگیری شود:

- ❌ Detached DOM Protection — جلوگیری از نگه‌داشتن رفرنس به Nodeهای حذف‌شده از DOM
- ✅ Destroy Event Listeners هنگام Unmount (در Preact: استفاده از `useEffect` cleanup function)
- ✅ استفاده از `AbortController` برای لغو عملیات async ناتمام
- ✅ استفاده از `WeakRef` در صورت نیاز به نگه‌داری رفرنس بدون جلوگیری از Garbage Collection

### Search/Sort Optimization (همچنان معتبر)

- Indexed Search
- Debounced Filtering
- Worker-Assisted Sorting برای دیتاست‌های بزرگ (طبق سند 10)

### Render Optimization Rules *(جدید — پیشنهاد بازبینی)*

**Status:** REQUIRED

- اجتناب از Re-render غیرضروری
- استفاده از Memoization فقط زمانی که Profiling فایده‌اش را ثابت کند
- لیست‌های بزرگ باید Virtualized باشند
- محاسبات سنگین هرگز نباید داخل Render اجرا شوند
- داده‌های Derived باید Memoize شوند

> **دلیل:** خطر رایج در پروژه‌های Preact/React این است که توسعه‌دهنده عملیات Sort/Filter/Analyze را مستقیماً داخل تابع Render اجرا کند — که Performance را نابود می‌کند.

---

## Document Control

| Field | Value |
|---|---|
| نسخه | v2.1 |
| بازبینی نهایی (بدون تغییر محتوا) | نکته‌ی «Virtual List Library هنوز انتخاب نشده» در این دور هم تکرار شد (سومین بار، بعد از v2.0 همین سند و سند 14) — چون محتوا تکراری بود، تغییری اعمال نشد؛ تصمیم همچنان موکول به Phase 9 می‌ماند. این آخرین فایلی بود که در دور نهایی بازبینی شد و نیاز به ویرایش نداشت. |
| اصلاحات نسبت به v2.0 | (بر اساس بازبینی مهدی) افزودن Render Optimization Rules |
| Task باقی‌مانده‌ی واقعی | انتخاب و یکپارچه‌سازی یک کتابخانه‌ی Virtual List سبک (تصمیم در Phase 9 طبق سند 09) |
| ✅ ارجاع به سند دیگر | پیشنهاد «Virtual List Library باید Actively Maintained باشد» مستقیماً در سند 14 (Dependency Policy) اعمال می‌شود |
| سند بعدی | `14-BLUEPRINT_DEPENDENCY_POLICY` |
