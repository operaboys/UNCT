# IMPLEMENTATION BLUEPRINT v1.1

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | APPROVED — بدون تغییر منطقی، فقط بازآرایی و هماهنگی با تصمیم Preact |
| **وابسته به** | 14-DEPENDENCY_POLICY |

---

## 1. Target Platform Priority

| اولویت | پلتفرم |
|---|---|
| P1 | Android |
| P2 | Desktop (Windows / Linux / Mac) |
| P3 | Web Browser |

---

## 2. Technology Decision

**Frontend:** HTML5 · CSS3 · JavaScript ES2023 · TypeScript (Optional Future)

> 🔗 به‌روزرسانی: علاوه بر این‌ها، **Preact** به‌عنوان UI Framework تأییدشده اضافه شده (طبق سند 14). این تصمیم اصل زیر را نقض نمی‌کند چون Preact به‌صورت فایل JS استاتیک قابل استفاده است.

**Architecture:**
- Pure Client-Side Application
- No Backend
- No API Dependency
- No Database Server
- No Cloud Dependency

---

## 3. Storage

- IndexedDB
- LocalStorage
- Exportable Project Files

### Storage Responsibility Matrix *(جدید — پیشنهاد بازبینی)*

| لایه | مسئولیت |
|---|---|
| **IndexedDB** | Projects, Large Subscriptions, Cached Analysis, Test Datasets |
| **LocalStorage** | Theme, UI Preferences, Recent Settings |
| **Project Files (Export/Import)** | Backup, Import, Export, Migration |

> 🔗 **دلیل:** بدون این تفکیک، ریسک واقعی داشتیم که داده‌ی بزرگ (مثل Cached Analysis) به‌اشتباه در LocalStorage ذخیره شود — که محدودیت حجم بسیار کمی دارد (معمولاً ۵-۱۰MB) و باعث Crash می‌شود.

**چرا این انتخاب؟**
- روی Android اجرا می‌شود
- روی Termux اجرا می‌شود
- روی مرورگر اجرا می‌شود
- نصب لازم ندارد
- آفلاین کار می‌کند
- نگهداری ساده‌تر است

---

## 4. Packaging Strategy

```
Core Product → Single HTML Application → PWA → Android APK
```

> ⚠️ **Flag معماری باز (نیاز به یک ADR واحد، نه تصمیم همین‌جا):** «Single HTML Application» به‌عنوان خروجی نهایی، با حجم پروژه (ده‌ها ماژول طبق `MASTER_FILE_STRUCTURE`) در تنش است. راه‌حل بدیهی (یک Bundler مثل esbuild برای فشرده‌سازی نهایی) **با قانون قفل‌شده‌ی `No Build Step`** (سند `01-MASTER_BLUEPRINT` / `14-DEPENDENCY_POLICY`) در تناقض است — نمی‌توان یکی را بدون بازبینی رسمی نادیده گرفت.
>
> 🔗 **این Flag با یک تنش دیگر یکی شد (بازبینی نهایی):** `htm` (جایگزین JSX بدون Build، سند 14) با TypeScript به‌خوبی کار نمی‌کند (Tagged Templates، Type Inference ضعیف). یعنی اگر روزی پروژه به TypeScript نیاز پیدا کند (که سند IMPLEMENTATION آن را «Optional Future» خوانده)، همان سؤال Build Step دوباره مطرح می‌شود. این دو تنش در واقع **یک سؤال واحد** هستند: «آیا یک Build Step سبک (فقط برای Bundle/Type-Check نهایی، نه برای حلقه‌ی توسعه‌ی روزانه) پذیرفته می‌شود یا نه؟» — پس باید با **یک ADR مشترک** حل شوند، نه دو ADR جدا.
>
> **گزینه‌های ممکن (تصمیم‌گیری موکول به همان ADR مشترک، نه الان):**
> 1. **مسیر Zero-Build کامل:** JavaScript خالص + `htm` + Native ES Modules، بدون TypeScript و بدون Bundler. ساده‌ترین مسیر برای MVP؛ TypeScript برای همیشه «Future» می‌ماند مگر این مسیر بعداً با ADR جدید عوض شود. ریسک: import ماژول از `file://` در برخی مرورگرها (و بعضی WebViewهای اندروید) با محدودیت CORS مواجه می‌شود.
> 2. **مسیر Build Step سبک:** پذیرش یک Build Step *فقط برای Bundle/Type-Check نهایی* (نه برای حلقه‌ی توسعه)، با TypeScript + JSX از همان ابتدا، و اصلاح رسمی قانون `No Build Step` با ADR.
> 3. توزیع به‌صورت یک پوشه (نه یک فایل) برای حالت PWA/Capacitor، و فقط حالت «باز کردن مستقیم فایل» Single-File و Zero-Build بماند.
>
> این تصمیم باید قبل از Phase 9 (سند 09) گرفته شود، نه همین الان.

---

## 5. Android Strategy

**Primary Targets:** Android 12+ تا Android 15+

> ⚠️ **اصلاح تناقض (بازبینی نهایی):** نسخه‌ی قبلی «Android 10+» را هدف می‌گرفت، در حالی که بخش ۸ همین سند (Browser Compatibility Baseline) «Chrome 120+» را الزامی می‌کند. این دو با هم در تناقض بودند: Android 10 می‌تواند WebView بر پایه‌ی نسخه‌های بسیار قدیمی‌تر Chromium داشته باشد (به‌خصوص روی دستگاه‌هایی که Google Play System Updates به‌موقع دریافت نمی‌کنند) و برخی از ES2023/Web Worker APIهای مورد نیاز پروژه را کامل پشتیبانی نمی‌کند.
>
> **تصمیم:** حداقل نسخه به **Android 12+** ارتقا یافت. دلیل: سهم بازار Android 10/11 کمتر از ۵٪ است و پیچیدگی نگه‌داری یک Polyfill Strategy (که با اصل Minimal Dependencies سند 14 هم در تنش است) ارزشش را ندارد.

### Deployment Modes

| حالت | توضیح |
|---|---|
| Mode 1 | Open HTML File (مستقیم) |
| Mode 2 | Progressive Web App (نصب‌پذیر) |
| Mode 3 | Trusted Web Activity APK (آماده‌ی Play Store) |
| Mode 4 | Capacitor APK (یکپارچگی پیشرفته‌ی Android) |

---

## 6. Recommended Build Path

```
Phase 1: HTML/CSS/JS (+ Preact)
   ↓
Phase 2: PWA
   ↓
Phase 3: Capacitor Android App
```

### مزایا
- Single Codebase
- Offline
- Fast Updates
- No Rewrite
- Easy Maintenance
- Minimal APK Size
- Future Desktop Support

---

## 7. Release Channels *(جدید — پیشنهاد بازبینی)*

> مشخص می‌کند هر Build چطور و برای چه کسی منتشر می‌شود.

| Channel | هدف |
|---|---|
| **Development** | ساخت داخلی، بدون انتشار عمومی، برای تست روزانه |
| **Beta** | انتشار محدود برای تست واقعی قبل از Stable (مرتبط با Beta Gate سند 09) |
| **Stable** | نسخه‌ی نهایی منتشرشده (مرتبط با Stable Gate سند 09) |

> این کانال‌ها مستقیماً با Release Gates تعریف‌شده در `09-DEVELOPMENT_ROADMAP` هماهنگ هستند، نه یک سیستم جدا.

---

## 8. Browser Compatibility Baseline *(جدید — پیشنهاد بازبینی)*

> با توجه به وابستگی پروژه به IndexedDB، Web Workers، ES2023، و Preact، حداقل نسخه‌ی پشتیبانی‌شده باید صریح باشد:

**پشتیبانی‌شده:**
- Chrome 120+
- Edge 120+
- Firefox 120+
- Samsung Internet 24+

**پشتیبانی‌نشده:**
- Legacy Android Browsers
- Internet Explorer
- نسخه‌های قدیمی Android WebView

> 🔗 این Baseline با ماتریس کلی مرورگرها در سند `15-TESTING_FRAMEWORK` هماهنگ است؛ آن سند *کجا* تست می‌شود را مشخص می‌کند، این سند *حداقل نسخه‌ی قابل‌قبول* را.

---

## 9. Architecture Commitment *(جدید — پیشنهاد بازبینی)*

**UNCT Is Implemented As:**

- Offline First
- Client Side First
- Android First
- Worker First
- UNM Centric

> **These Principles Must Not Change Without Architecture Review** (طبق Rule 13 سند ANTI_CHAOS — نیاز به ADR).

---

## 10. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) ارتقای حداقل Android از 10+ به **12+** برای رفع تناقض با Chrome 120+ Baseline؛ ادغام تنش `htm vs TypeScript` با Flag باز قبلی (Build Step) به‌عنوان یک ADR مشترک |
| اصلاحات نسبت به v1.2 | (بازبینی اولویت ۳) ثبت یک تنش معماری واقعی بین «Single HTML Output» و قانون قفل‌شده‌ی «No Build Step» — موکول به ADR قبل از Phase 9، نه حل‌شده در همین سند |
| ⚠️ مهم | تنها دو مورد در کل بازبینی که قوانین از‌قبل‌قفل‌شده را به چالش می‌کشند (Build Step + Android Version) — Android Version همین‌جا حل شد (تصمیم کم‌ریسک و مستدل)؛ Build Step هنوز نیاز به ADR رسمی دارد |
| سند بعدی | `MASTER_FILE_STRUCTURE` |
