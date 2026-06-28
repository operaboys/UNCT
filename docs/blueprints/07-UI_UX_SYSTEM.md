# BLUEPRINT 07 — UI/UX SYSTEM

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — هم‌راستا با تصمیم Preact، تفکیک Future Modules |
| **Priority** | CRITICAL |
| **وابسته به** | 14-DEPENDENCY_POLICY (استثنای Preact) |

> ⚠️ **تغییرات نسبت به نسخه‌ی اصلی:**
> 1. بخش «Future UI Modules» به Backlog منتقل شد.
> 2. یادآوری معماری: کامپوننت‌ها با **Preact** ساخته می‌شوند، نه Vanilla JS دستی — یعنی State/Re-render توسط فریم‌ورک مدیریت می‌شود، نه یک Render Engine سفارشی (جزئیات در سند 13).

---

## 1. Design Philosophy

Professional · Modern · Fast · Minimal · Information Dense · Mobile First · Desktop Optimized · Offline First

---

## 2. Visual Identity

**Style:** Cyber Professional, Glassmorphism, Neumorphism Elements, Terminal Inspired, Developer Friendly

### Color System

| نقش | رنگ |
|---|---|
| Primary Accent | Electric Blue |
| Secondary Accent | Purple |
| Success | Green |
| Warning | Amber |
| Error | Red |
| Neutral | Slate |

### Theme Engine
Dark Mode · Light Mode · Auto Mode · System Sync

---

## 3. Layout Architecture

```
App Shell → Sidebar → Workspace → Inspector → Console
```

---

## 4. Main Screens

Dashboard · Converter · Analyzer · Subscription Center · Extractor · Export Center · Settings · Developer Console

### 4.1 Dashboard
Quick Stats, Recent Imports, Recent Exports, Node Summary, Health Overview, Warnings

### 4.2 Converter Screen
```
Input Panel → Parser Preview → Normalized Object → Output Panel
```
- **Input Panel:** Paste Area, File Upload, Drag-Drop Zone, Clipboard Import
- **Parser Preview:** Detected Format, Confidence Score, Protocol Count, Errors, Warnings
- **Recovery Actions** *(جدید — پیشنهاد بازبینی)*: Recovered Fields Count, Repair Actions (مثل "Broken Base64 Fixed", "URL Encoding Repaired"), Recovery Warnings
  > این اطلاعات از قبل در `metadata.recoveryActions` (سند 05) و Stage 10/11 (سند 04) وجود دارد؛ این بخش فقط نمایش آن در UI است.
- **Output Panel:** Generated Links, JSON, YAML, QR

### 4.3 Analyzer Screen
Node Details, Protocol Analysis, Security Analysis, Compatibility Analysis, Cloudflare Analysis*, Reality Analysis

> *تحلیل Cloudflare طبق سند 06 در فاز نیمه‌قطعی است؛ این بخش از UI تا تکمیل آن ماژول به‌صورت Placeholder/Disabled نمایش داده می‌شود.

### 4.4 Subscription Center
Node List, Search, Filter, Group, Tag, Sort, Merge, Split, Deduplicate

> ⚠️ این صفحه باید تا ۱۰,۰۰۰+ نود را بدون لگ نشان دهد. به‌جای Render Engine دستی، از یک کتابخانه‌ی Virtual List سبک (مثل `preact-virtual-list` یا معادل) استفاده می‌شود (جزئیات در سند 13).

### 4.5 Extractor Screen
UUID, IP, Domain, Worker*, Reality, DNS Extractor

> *Worker Extractor به فاز نیمه‌قطعی Analyzer وابسته است.

### 4.6 Export Center
TXT, JSON, CSV, YAML, ZIP, QR, HTML Report

> 🔗 **افزوده‌شده (پیشنهاد بازبینی):** **Clipboard Export / Quick Copy Actions** — کپی سریع به Clipboard. شاید از نظر تخصصی «Export» محسوب نشود، اما در ابزارهای شبکه‌ای یکی از پرکاربردترین قابلیت‌هاست و باید کنار بقیه‌ی Export Profiles (سند 08) در دسترس باشد.

### 4.7 Developer Console
Parser Logs, Warnings, Errors, Recovery Logs, Validation Logs, Performance Logs

> 🔗 **افزوده‌شده (پیشنهاد بازبینی):** **Detection Logs / Detection Metadata Viewer** — نمایش Confidence Score و Alternative Candidates که در سند 04 (Stage 02 — Detection Metadata) تعریف شده‌اند. بدون این بخش، آن داده‌ی ارزشمند جایی برای نمایش ندارد.

---

## 5. Mobile UX Rules
Single Column · Bottom Navigation · Floating Actions · Large Touch Targets

> 🔗 **پیشنهاد بازبینی:** در موبایل، `Sidebar` (که در Layout Architecture بخش ۳ آمده) عملاً جایی برای نمایش ندارد. باید **Collapse شود به Bottom Navigation یا Drawer**.

## 6. Desktop UX Rules
Multi Panel Layout · Resizable Panels · Keyboard Shortcuts · Advanced Inspector

## 7. Accessibility
Keyboard Navigation · High Contrast · Screen Reader Friendly · Scalable Typography

---

## 8. Backlog — Future UI Modules

> ایده‌هایی برای آینده؛ بدون Spec و بدون Commitment زمانی (مطابق Rule 7 سند ANTI_CHAOS).

- Visual Graph Explorer
- Node Relationship Map
- Subscription Visualizer
- Cloudflare Topology View
- Reality Visualizer

---

## 8.1 تصمیم نهایی: بدون Event Bus جدا *(جدید — بازبینی نهایی؛ بستن Flag باز قبلی)*

**تصمیم:** پروژه از **Preact Context API + Hooks** به‌تنهایی استفاده می‌کند (مسیر A). هیچ کتابخانه‌ی Event Bus جدا (مثل `mitt` یا `eventemitter3`) در MVP اضافه نمی‌شود.

**چرا این تصمیم کم‌ریسک است:**
- جریان داده‌ی پروژه از ابتدا **Function-Call-Based** طراحی شده (`Parser → UNM → Analyzer → ...`، سند 02)، نه Event-Driven؛ یعنی هیچ Listener نامتزامنی منتظر «رویداد» نیست.
- تنها استثنای واقعی Async، ارتباط با Web Worker است که با `postMessage` خام (سند 10) مدیریت می‌شود، نه با یک Event Bus سفارشی.
- Selector Pattern (سند 11، ANTI_CHAOS) همان نیاز «اطلاع‌رسانی تغییر» را برای UI حل می‌کند، بدون اضافه‌کردن یک Dependency جدید (هم‌خوان با اصل Minimal Dependencies، سند 14).

**مسیر فرار (Escape Hatch):** اگر در Phase 6 (Analyzer Engine) رویدادهای Domain واقعاً پیچیده شدند (نه فرضی)، مهاجرت به یک Event Bus سبک با یک ADR جدید بررسی می‌شود — نه از همین الان.

---

## 9. Language Support (i18n + RTL) *(جدید — افزوده‌شده طبق تصمیم دوزبانه‌سازی پروژه)*

> ⚠️ **تصمیم معماری:** پروژه از این مرحله به بعد **دوزبانه** است (فارسی/انگلیسی، با حق انتخاب
> کاربر). این بخش فقط **زیرساخت** (Architecture Spec) را ثبت می‌کند؛ Dictionary این فاز خالی/حداقلی
> است — محتوای ترجمه‌شده‌ی کامل هر ۸ صفحه عمداً به فاز نهایی طراحی بصری موکول شده (بخش ۹.۱۰ پایین).
> تصمیم معماری کامل (چرا Dictionary خودساخته، چرا نه کتابخانه‌ی آماده) در
> `ADR-019-BILINGUAL-I18N-ARCHITECTURE` ثبت شده؛ این بخش فقط **چگونگی** پیاده‌سازی در UI را مشخص
> می‌کند.

### 9.1 معماری: i18n سبک و خودساخته

سیستم ترجمه یک **Dictionary-based i18n** کوچک و دستی در `core/i18n/` است (شیء ساده‌ی
`{ key: string }` برای هر زبان + یک تابع `t(key)`/`translate(key)`) — **نه** یک کتابخانه‌ی سنگین
مثل `i18next`/`react-intl`. طبق `14-DEPENDENCY_POLICY` (Philosophy: *Minimal Dependencies ·
Maximum Control*)، هر Dependency جدید نیاز به تأیید معماری دارد؛ برای نیاز این پروژه (Key→String
Lookup + Pluralization ساده، بدون i18n پیچیده‌ی چندزبانه‌ی هم‌زمان) یک Dictionary دستی کافی است و
هیچ Bundle Size اضافه‌ای (طبق §۲.۱ همان سند) به پروژه تحمیل نمی‌کند.

### 9.2 Persist: همان الگوی Theme، نه یک Store جدا

انتخاب زبان دقیقاً با همان الگوی موجود برای Theme (`core/store/settings-state.js` +
`core/storage/local-adapter.js`) ذخیره می‌شود — **نه** یک Store/کلید مستقل و موازی. طبق
**State Ownership Rule** (`11-STATE_MANAGEMENT` — «هر State فقط یک Owner دارد»)، Settings State
از قبل Owner تنظیمات کاربر (Theme) است؛ Language یک تنظیم هم‌رده‌ی Theme است، نه دامنه‌ی جدید —
پس باید همان Store را گسترش دهد (مثلاً `LanguageChoice = "fa" | "en" | "auto"` در کنار
`ThemeChoice` موجود)، نه یک Context/Adapter جدید بسازد.

### 9.3 تشخیص خودکار اول بار

مثل Theme Engine (بخش ۲ — Auto Mode/System Sync)، Language هم یک حالت `"auto"` دارد: اولین بار
(پیش از هر انتخاب دستی کاربر) از `navigator.language` تشخیص داده می‌شود. به‌محض این‌که کاربر
زبان را دستی عوض کند، آن انتخاب همیشه برنده است و Persist می‌شود — `"auto"` فقط رفتار حالت
پیش‌فرض/اولیه است، نه یک Override دائمی روی انتخاب کاربر.

### 9.4 فونت: Vazirmatn، Self-hosted، با `unicode-range`

فونت فارسی پروژه **Vazirmatn** (یا معادل آزاد با همان کیفیت) است، به‌صورت **Self-hosted/Embedded**
در پروژه — **نه از CDN** (بارگذاری از CDN ناقض اصل Offline-First، بخش ۱ همین سند، است؛ پروژه باید
با باز کردن یک فایل HTML بدون اینترنت کار کند). برای کنترل Bundle Size (`14-DEPENDENCY_POLICY`
§۲.۱)، فونت با `unicode-range` در `@font-face` تعریف می‌شود تا مرورگر آن را **فقط وقتی صفحه
واقعاً کاراکتر فارسی دارد** بارگذاری کند — نه همیشه، حتی برای کاربری که در حالت زبان انگلیسی است.

### 9.5 مرز اعداد: همیشه ASCII

هیچ‌وقت، در هیچ نقطه‌ای از برنامه، رقم فارسی/عربی رندر نمی‌شود — نه فقط در IP/Port/UUID (که سند ۰۴
هم‌اکنون پوشش می‌دهد، Stage 01 — Preprocessor)، بلکه در **هیچ متن دیگری** هم. مرز دقیق: فقط
**رشته‌های متنی UI** (Labelها، پیام‌ها، Tooltipها) ترجمه می‌شوند؛ هر عددی که رندر می‌شود (شمارنده،
اندازه‌ی فایل، تاریخ/زمان، هر شناسه‌ی عددی) همیشه ASCII (`0-9`) باقی می‌ماند، حتی در حالت زبان
فارسی.

### 9.6 مرز محتوای فایل Export: زبان UI ≠ زبان فایل خروجی

ترجمه فقط روی **برچسب‌های خود برنامه** (UI Labels) اثر می‌گذارد. محتوای خودِ فایل‌های Export شده
(CSV, JSON, HTML Report — سند ۰۸) همیشه ساختار/زبان فعلی (انگلیسی) خودش را حفظ می‌کند — **مستقل**
از این‌که کاربر هنگام Export، زبان UI را روی فارسی یا انگلیسی گذاشته بود. دلیل: این فایل‌ها
قراردادهای داده‌ای (Data Contracts) هستند که ممکن است توسط ابزار دیگری Parse/Import شوند؛ تغییر
زبان محتوای آن‌ها بر اساس یک تنظیم UI، یک Breaking Change نامرئی برای مصرف‌کننده‌ی پایین‌دستی آن
فایل می‌شود.

### 9.7 مرز پیام خطا/هشدار Core: فقط Code، نه متن ترجمه‌شده

طبق Rule 11 سند `ANTI_CHAOS_BLUEPRINT` («مرز دقیق Rule 11» — Selector Pattern به‌عنوان نقطه‌ی
عبور مجاز بین Core و UI)، `core/` هرگز خودش پیام ترجمه‌شده برنمی‌گرداند. هر خطا/هشدار از Core فقط
یک **Code** است (همان Error Code Registry موجود، `core/types/errors.js`/`errors.d.ts`)؛ نگاشت
Code → پیام ترجمه‌شده (فارسی/انگلیسی) منحصراً در لایه‌ی UI/Dictionary انجام می‌شود. این یعنی
Dictionary باید برای هر Error/Warning Code یک Key معادل داشته باشد — نه این‌که Core رشته بسازد.

### 9.8 `dir="auto"` برای محتوای کاربر، مستقل از جهت کل صفحه

جهت کل صفحه (`dir="rtl"`/`dir="ltr"`) از زبان فعال برنامه می‌آید. اما فیلدهایی که **محتوای آزاد
کاربر** را نشان می‌دهند (مثلاً Remark یک Node، بخش ۴.۲) باید مستقل از این، `dir="auto"` داشته
باشند — چون محتوای آن‌ها (که می‌تواند فارسی، عربی، یا انگلیسی باشد، مستقل از زبان UI) باید بر
اساس کاراکترهای واقعی خودش راست‌چین/چپ‌چین شود، نه بر اساس زبان فعلی برنامه.

### 9.9 تست‌های الزامی: تکمیل ترجمه + RTL بصری

- **تست تکمیل ترجمه (Translation Completeness):** یک تست خودکار (Vitest) که هر Key موجود در
  Dictionary انگلیسی را با Dictionary فارسی مقایسه می‌کند؛ اگر حتی یک Key معادل فارسی نداشته
  باشد، تست Fail می‌شود. **بدون Silent Fallback** — یعنی به‌جای این‌که در نبود ترجمه‌ی فارسی،
  برنامه خودش بی‌صدا متن انگلیسی نشان دهد و مشکل دیرتر کشف شود، خود Build/Test باید شکست بخورد.
- **تست بصری RTL (Playwright):** یک تست E2E که با `dir="rtl"` فعال، هر صفحه‌ی اصلی (بخش ۴) را
  بررسی می‌کند و مطمئن می‌شود **Overflow افقی ناخواسته** (Scrollbar افقی غیرمنتظره، خروج عنصر از
  Viewport) وجود ندارد.

### 9.10 اولویت‌بندی این فاز: زیرساخت اول، ترجمه‌ی کامل و پولیش RTL بعداً

**Spec قطعی همین فاز** فقط زیرساخت است: Dictionary (حتی اگر فعلاً خالی/حداقلی)، سوییچ زبان
(UI Control + Persist طبق بخش ۹.۲)، و رعایت RTL **پایه** (جهت صفحه، فونت، مرز اعداد). **ترجمه‌ی
کامل محتوای هر ۸ صفحه‌ی اصلی** (بخش ۴) و **پولیش کامل بصری RTL** (چیدمان آینه‌ای دقیق هر
Component، طبق `RTL-GUIDELINES.md`) عمداً به همان فاز نهایی طراحی بصری (Glassmorphism/Theme —
بخش ۲ همین سند) در انتهای کل Roadmap (سند ۰۹) موکول می‌شود. این یک تصمیم Scope‌بندی است، نه
کوتاهی: دو کار مجزا (زیرساخت قابل‌استفاده در طول توسعه، و پولیش بصری نهایی) با یک تصمیم واحد از
هم جدا شدند.

> 📐 برای قوانین عملی کد (نه تصمیمات معماری) هنگام نوشتن/ویرایش هر Component مرتبط با RTL، به
> `docs/architecture/RTL-GUIDELINES.md` مراجعه شود — آن سند باید **هر بار قبل از** هر تغییر کد UI
> دوباره خوانده شود.

---

## 10. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (دوزبانه‌سازی پروژه) افزودن بخش ۹ — Language Support (i18n + RTL): معماری Dictionary خودساخته، Persist هم‌الگو با Theme، تشخیص خودکار `navigator.language`، فونت Vazirmatn با `unicode-range`، مرز اعداد ASCII، مرز زبان فایل Export، مرز Code-only پیام خطای Core، `dir="auto"` محتوای کاربر، الزام تست تکمیل ترجمه و تست بصری RTL، و تصمیم Scope‌بندی زیرساخت/ترجمه‌ی کامل |
| اصلاحات نسبت به v1.2 | (بازبینی نهایی) بستن Flag باز Event Bus — تصمیم نهایی: فقط Preact Context API، بدون کتابخانه‌ی جدا (بخش 8.1) |
| اصلاحات نسبت به v1.1 | (بر اساس بازبینی مهدی) افزودن Sidebar Collapse Rule، Recovery Actions در Converter، Clipboard Export، Detection Logs در Developer Console |
| سند بعدی | `08-BLUEPRINT_EXPORT_ENGINE` |
