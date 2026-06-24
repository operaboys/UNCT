# BLUEPRINT 11 — STATE MANAGEMENT (DEPRECATED → MERGED)

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | ⚠️ **DEPRECATED** — جایگزین شده توسط Preact |
| **Version** | 2.0 (نسخه‌ی کوچک‌شده) |

---

## چرا این سند منسوخ شد؟

نسخه‌ی اصلی این بلوپرینت توصیف یک **Store دستی، Pub/Sub Engine، Event Bus، و Reactive Engine مبتنی بر ES6 Proxy** را می‌داد — یعنی در عمل، بازسازی بخشی از قابلیت‌هایی که فریم‌ورک‌های سبک مثل React/Vue/Preact به‌صورت توکار ارائه می‌دهند.

با تصمیم استفاده از **Preact** (مستندشده در `09-DEVELOPMENT_ROADMAP` و `14-DEPENDENCY_POLICY`)، نیازی به ساخت این موتور از صفر نیست:

| نیاز قبلی | راه‌حل جدید |
|---|---|
| Store دستی | `useState` / `useReducer` (Preact Hooks) |
| Pub/Sub Engine دستی | Props + Context API (Preact) |
| Reactive Engine (ES6 Proxy) | Virtual DOM Diffing توکار Preact |
| Event Bus سفارشی | Custom Hook ساده (`useEvent`) در صورت نیاز واقعی |

> این یک تصمیم Over-engineering-avoidance است، نه کوتاهی در معماری. اصل **Single Source of Truth** و **Immutable State** که در نسخه‌ی اصلی تأکید شده بود، همچنان رعایت می‌شود — صرفاً موتورش را خودمان نمی‌نویسیم.

---

## چه‌چیزی از سند اصلی باقی ماند؟ (تنها بخش با‌ارزش)

### State Domains (مفهومی، نه پیاده‌سازی)

این تفکیک منطقی state بین دامنه‌های مختلف همچنان معتبر و مفید است و باید در ساختار Context/Hookهای Preact رعایت شود:

- Parser State
- Analyzer State
- Converter State
- Export State
- UI State
- Settings State
- Storage State

### State Ownership Rule *(جدید — پیشنهاد بازبینی)*

> هر State فقط **یک Owner** دارد.

**ممنوع:** یک داده هم‌زمان در چند Context مستقل نگه‌داری شود.
**مجاز:** Single Source of Truth برای هر داده.

**نمونه:**

| داده | Owner |
|---|---|
| Node Collection | Storage State |
| UI Filters | UI State |
| Export Settings | Export State |

**دلیل:** اکثر باگ‌های پروژه‌های مبتنی بر Preact/React از Duplicate State (نگه‌داری یک داده در چند جا) می‌آیند.

### Selector Pattern برای Performance *(جدید — بازبینی نهایی)*

> ⚠️ **گلوگاه واقعی:** اگر کل مجموعه‌ی `UNMNode`ها مستقیماً در یک State واحد نگه داشته شود، یک تغییر کوچک (مثلاً آپدیت `validation.overallValid` روی یک نود) می‌تواند کل Subscription Center (۱۰,۰۰۰+ نود) را Re-render کند — چون Preact با تغییر Reference والد، به همه‌ی فرزندان خبر می‌دهد.

**راه‌حل:** استفاده از **Selector Pattern** (همان الگویی که در `ANTI_CHAOS_BLUEPRINT`، بخش «مرز دقیق Rule 11» تعریف شد) — UI به‌جای خواندن مستقیم کل لیست، از توابع Selector کوچک و هدفمند استفاده می‌کند:

```javascript
// ❌ بد — هر تغییر در هر نود، کل لیست را Re-render می‌کند
const nodes = useStore(state => state.nodes);

// ✅ خوب — فقط وقتی نتیجه‌ی فیلتر/Selector تغییر کند، Re-render رخ می‌دهد
const validNodeIds = useStore(state =>
  state.nodes.filter(n => n.validation.overallValid).map(n => n.nodeId)
);
```

> Selectorها باید Memoize شوند (طبق Render Optimization Rules، سند 13) تا با هر Render دوباره محاسبه نشوند.

### قوانین مفهومی که باقی می‌مانند

- ❌ No Direct DOM State (یعنی `document.getElementById()` هرگز منبع State نباشد)
- ❌ No Hidden State
- ❌ No Duplicate State
- ✅ هر آپدیت State باید یک State جدید بسازد (Immutable Update Pattern) — این اصل با `useState`/`useReducer` به‌صورت طبیعی رعایت می‌شود.

---

## Debug Mode (همچنان معتبر، با ابزار جدید)

به‌جای ساخت State Viewer/Mutation Log دستی، استفاده از **Preact DevTools** (افزونه‌ی مرورگر) برای:
- مشاهده‌ی درخت Component و Props/State
- ردیابی Re-render

> در صورت نیاز به قابلیت‌های اختصاصی (مثل Time Travel Snapshot برای دیباگ Parser)، این به‌عنوان یک Hook سفارشی کوچک در پروژه نوشته می‌شود، نه یک Engine کامل.

---

## Document Control

| Field | Value |
|---|---|
| نسخه | v2.1 |
| اصلاحات نسبت به v2.1 | (بازبینی نهایی) افزودن Selector Pattern برای جلوگیری از Re-render بی‌دلیل لیست‌های بزرگ هنگام تغییر یک نود |
| اصلاحات نسبت به v2.0 | (بر اساس بازبینی مهدی) افزودن State Ownership Rule با جدول نمونه |
| ریسک این تغییر | در صورتی که بعداً نیاز به منطق State پیچیده‌تر از حد Hookهای ساده پیدا شد (مثلاً Undo/Redo کامل)، باید این تصمیم با یک ADR (Architecture Decision Record) مجزا بازبینی شود |
| سند بعدی | `12-BLUEPRINT_PARSER_FACTORY` |
