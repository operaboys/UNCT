# BLUEPRINT 10 — PERFORMANCE ENGINE

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — حذف بخش‌های Render دستی، تمرکز بر Worker/Parsing |
| **Priority** | CRITICAL |
| **وابسته به** | 09-DEVELOPMENT_ROADMAP (Phase 5: Web Worker Engine) |

> ⚠️ **تغییر نسبت به نسخه‌ی اصلی:** بخش‌هایی که درباره‌ی ساخت دستی DOM Recycling / Virtual Scrolling بودند حذف شدند، چون این مسئولیت با آمدن **Preact** + یک کتابخانه‌ی Virtual List، به فریم‌ورک منتقل شده (جزئیات در سند 13 که خودش هم به همین دلیل بازنویسی شده). آنچه باقی می‌ماند، صرفاً به **پردازش سنگین در Web Worker** مربوط است که مستقل از انتخاب فریم‌ورک UI است.

## Mission

> پردازش سنگین هرگز نباید باعث Freeze شدن UI شود.

---

## 1. Performance Rules

| # | قانون |
|---|---|
| 01 | Main Thread فقط برای UI |
| 02 | Parsing در Worker |
| 03 | Analysis در Worker |
| 04 | Batch Conversion در Worker |
| 05 | Large Subscription Processing در Worker |

---

## 2. Worker Architecture

```
UI Thread
   ↓
Worker Manager
   ↓
Parser Worker Pool  →  Analyzer Worker Pool  →  Converter Worker Pool
```

> 🔗 **یادآوری (پیشنهاد بازبینی):** این نمودار خطی فقط برای نمایش وجود این سه Pool است، نه یک زنجیره‌ی اجباری. در عمل بعضی Jobها مستقیماً از Parser به Export می‌روند (مثلاً Import → Parse → Export، بدون عبور از Analyzer). **Worker Pool ها وابستگی سخت به هم ندارند** — هر Job فقط از Poolهایی استفاده می‌کند که واقعاً به آن نیاز دارد.

> 🔗 **یادداشت روشن‌سازی (پیشنهاد بازبینی):** این نمودار یک مسیر *نمونه* است، نه یک زنجیره‌ی اجباری. Worker Poolها به هم **وابستگی سخت ندارند** — مثلاً یک Job می‌تواند مستقیماً از Parser Pool به Export برود (`Import → Parse → Export`) بدون عبور از Analyzer Pool. هر Pool مستقل فراخوانی می‌شود؛ ترتیب بالا فقط شایع‌ترین سناریو را نشان می‌دهد.

---

## 3. Structured Clone Optimization — Status: REQUIRED

**مشکل:** انتقال آبجکت‌های بزرگ بین Worker و UI Thread هزینه‌بر است.

**راه‌حل‌های ترجیحی:** Transferable Objects, ArrayBuffer, SharedArrayBuffer (در صورت پشتیبانی مرورگر)

> ⚠️ **Feature Detection اجباری (جدید — بازبینی نهایی):** `SharedArrayBuffer` در مرورگرها (به‌خصوص حالت PWA/Web، نه لزوماً Capacitor APK) نیاز به دو هدر HTTP خاص دارد: `Cross-Origin-Opener-Policy` و `Cross-Origin-Embedder-Policy`. بدون این هدرها، استفاده از `SharedArrayBuffer` باعث Crash می‌شود، نه Fallback خودکار. **قانون:** قبل از استفاده، با `typeof SharedArrayBuffer !== 'undefined'` بررسی شود؛ در صورت نبود، به `MessageChannel`/`postMessage` معمولی Fallback شود. برای حالت "باز کردن مستقیم فایل HTML" یا Capacitor APK، این مشکل معمولاً رخ نمی‌دهد.

**سیاست:** پردازش داده داخل Worker انجام شود؛ فقط نتیجه‌ی نهایی (Minimal Result) منتقل شود.

### Flatten Before PostMessage *(جدید — بازبینی نهایی، رفع تنش با سند 06)*

> ⚠️ **تنش واقعی:** این سند می‌گوید فقط «Minimal Result» باید منتقل شود، اما Analyzer Engine (سند 06، ماژول‌های نیمه‌قطعی مثل Cloudflare/Worker Analyzer) ممکن است برای تحلیل دقیق به متادیتای نسبتاً سنگین نیاز داشته باشد.
>
> **قانون رفع تنش:** اگر Analyzer به داده‌ی غیرمینیمال نیاز دارد، Parser باید **قبل از خروج از Worker**، داده را به یک ساختار **تخت (Flat)** و سبک تبدیل کند (نه این‌که کل `UNMNode` تودرتو، با تمام Objectهای `metadata`/`validation`/`analysis`/`conversion`، یک‌جا Post Message شود). فقط فیلدهایی که Analyzer واقعاً به آن‌ها نیاز دارد، در پاسخ Worker قرار می‌گیرند.

---

## 4. YAML Memory Policy

- Streaming Parsing ترجیح داده می‌شود
- Event-Driven Parsing ترجیح داده می‌شود
- پرهیز از Full Memory Expansion
- نظارت بر مصرف حافظه

---

## 5. Worker Pool

| | |
|---|---|
| حداقل Worker | 2 |
| حداکثر Worker | `Max(2, Min(8, navigator.hardwareConcurrency - 1))` |

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (پیشنهاد بازبینی):** فرمول قبلی (`= hardwareConcurrency`) می‌توانست روی موبایل‌هایی با `hardwareConcurrency = 8` باعث ساخت ۸ Worker شود که برای گوشی همیشه ایده‌ی خوبی نیست. فرمول جدید هم یک هسته برای UI Thread نگه می‌دارد (`- 1`) و هم سقف بالا را محدود می‌کند (`Min(8, ...)`).
>
> ⚠️ **اصلاح Edge Case (بازبینی اولویت ۲):** فرمول قبلی روی دستگاه‌هایی با `hardwareConcurrency = 1` نتیجه‌ی `Min(8, 0) = 0` Worker می‌داد — یعنی سیستم عملاً می‌شکست (تناقض با ردیف «حداقل Worker = 2» در همین جدول). افزودن `Max(2, ...)` این تناقض را برطرف می‌کند؛ Web Workerها نیازی به هسته‌ی فیزیکی مجزا ندارند، فقط روی همان هسته صف می‌کشند — پس ۲ Worker حتی روی دستگاه تک‌هسته‌ای هم امن است.

---

## 6. Concurrency Control — Status: REQUIRED

**هدف:** جلوگیری از Race Condition در پردازش موازی

**قوانین:**
- نتایج Worker باید Versioned باشند
- نتایج Worker باید Ordered باشند
- آپدیت‌های State باید Atomic باشند

> ⏳ **Flag باز (بازبینی اولویت ۲ — باید قبل از پیاده‌سازی Worker Manager مشخص شود، نه الان):** «Versioned باشند» می‌گوید *که* باید Version داشته باشند، ولی مکانیزم دقیق مشخص نیست (Incrementing Version Number؟ Timestamp؟ JobId؟ GenerationId؟). پیشنهاد برای تصمیم بعدی: ترکیب `jobId` (یکتا برای هر Task) + `generationId` (شماره‌ی نسل، برای تشخیص Stale Job نسبت به Cancellation Policy، بخش 6.1). این الان مانع کار نیست.

**Conflict Resolution:** جدیدترین State معتبر برنده است (Newest Valid State Wins)

**ارتباط Worker:** فقط Message-Based، بدون Shared Mutable Object

### 6.1 Task Cancellation Policy *(جدید — پیشنهاد بازبینی)*

**Status:** REQUIRED
**هدف:** جلوگیری از هدررفت CPU و جلوگیری از آپدیت شدن State توسط Jobهای قدیمی (Stale Jobs).

**قوانین:**
- Workers باید از Task Cancellation پشتیبانی کنند
- Stale Jobs باید Discard شوند
- Job لغو‌شده هرگز نباید State را آپدیت کند
- فقط آخرین Task فعال حق انتشار نتیجه (Publish Result) را دارد

**مثال:**
```
Import A → User Imports B → A Cancelled → B Continues
```

---

## 7. Chunk Processing

```
Large Files → Chunk Split → Worker Queue → Merge Result
```

## 8. Streaming Processing — Required For:
Subscriptions, Large TXT Files, Large JSON Bundles

---

## 9. Performance Targets

| تعداد نود | زمان هدف |
|---|---|
| 100 Nodes | < 0.5 sec |
| 1,000 Nodes | < 3 sec |
| 10,000 Nodes | < 20 sec |

> این اعداد مربوط به **Parsing/Analysis** است (پردازش داده)، نه رندر بصری. برای هدف رندر UI به سند 13 مراجعه کنید.

---

## 10. Anti-Freeze Policy

UI FPS باید در طول تمام عملیات سنگین واکنش‌گرا (Responsive) باقی بماند.

---

## 11. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) افزودن Feature Detection اجباری برای SharedArrayBuffer (COOP/COEP headers) با Fallback به MessageChannel؛ افزودن قانون Flatten Before PostMessage برای رفع تنش با سند 06 |
| اصلاحات نسبت به v1.2 | (بازبینی اولویت ۲) رفع Edge Case فرمول Worker Pool روی دستگاه‌های تک‌هسته‌ای (`Max(2, Min(8, hardwareConcurrency-1))`)؛ ثبت Flag باز برای مکانیزم دقیق Versioning نتایج Worker |
| ✅ ارجاع به سند دیگر | پیشنهاد «UI Responsiveness Test» مستقیماً در سند 15 (Testing Framework) اعمال می‌شود |
| سند بعدی | `11-BLUEPRINT_STATE_MANAGEMENT` |
