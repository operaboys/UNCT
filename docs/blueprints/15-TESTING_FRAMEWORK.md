# BLUEPRINT 15 — TESTING FRAMEWORK

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | APPROVED — بدون تغییر منطقی، فقط بازآرایی |
| **Priority** | CRITICAL |

---

## 1. Mission

Guarantee Reliability · Guarantee Stability · Prevent Regression · Validate Every Core System

## 2. Testing Philosophy

- Testing Is Not Optional — Testing Is Part Of Development
- No Feature Is Complete Until Tested
- No Release Without Validation
- Every Bug Must Produce A New Test Case

---

## 3. Testing Pyramid

| سطح | نوع |
|---|---|
| 1 | Unit Tests |
| 2 | Integration Tests |
| 3 | System Tests |
| 4 | Performance Tests |
| 5 | Release Validation |

## 4. Test Categories

Parser · Validation · Recovery · Analyzer · Converter · Storage · Worker · State Management* · Render* · Export · Plugin · Security · Compatibility · Performance

> *به‌خاطر تغییرات اسناد 11 و 13، تست‌های "State Management" و "Render" اکنون عمدتاً شامل تست رفتار صحیح Hookها/Componentهای Preact و کتابخانه‌ی Virtual List هستند، نه یک Engine سفارشی.

---

## 5. Baseline Test Dataset — Status: MANDATORY

| ترکیب | تعداد |
|---|---|
| Valid Configurations | 50 |
| Partially Broken Configurations | 30 |
| Invalid Configurations | 20 |
| **مجموع** | **100** |

**پوشش پروتکل:** VLESS, VMESS, TROJAN, TUIC, HY2, WIREGUARD, CLASH, CLASH META, SING-BOX, XRAY

**هدف:** Regression Testing · Parser Validation · Recovery Validation · Converter Validation

**قانون:** بدون عبور از این دیتاست، هیچ Release ای منتشر نمی‌شود.

### Golden Dataset *(جدید — پیشنهاد بازبینی)*

> در کنار Baseline Test Dataset (که می‌تواند رشد کند)، یک زیرمجموعه‌ی ثابت و تغییرناپذیر هم لازم است:

- **۲۰ کانفیگ Canonical** (نمونه‌های مرجع، پوشش‌دهنده‌ی پروتکل‌های اصلی)
- هرگز Modify نمی‌شوند
- هرگز Remove نمی‌شوند
- در **هر** Release اجرا می‌شوند

**دلیل:** اگر روزی رفتار Parser به‌طور ناخواسته تغییر کند (مثلاً بعد از یک Refactor)، Golden Dataset فوراً Regression را نشان می‌دهد — حتی اگر Baseline Dataset (که قابل رشد است) هنوز Pass شود.

---

## 6. Foundation Acceptance Gate — Status: REQUIRED

Phase 1 (طبق سند 09) کامل نیست مگر:

- UNM Stable
- Validation Stable
- Error Registry Complete
- Baseline Test Dataset Pass Rate ≥ 95%
- Recovery Engine روی نمونه‌های خراب موفق عمل کند
- بدون Critical Failure

فقط بعد از عبور از این Gate، توسعه به Phase 2 ادامه می‌یابد.

---

## 7. اهداف و الزامات هر دسته

| دسته | اهداف | الزام |
|---|---|---|
| **Parser** | Parsing/Recovery/Normalization Accuracy | Parser ≥95%, Recovery ≥90%, Normalization ≥99% |
| **Validation** | تشخیص ساختار نامعتبر/فیلد گمشده/فرمت ناشناخته | False Positive Rate < 2% |
| **Recovery** | حداکثر بازیابی ساختار | ❌ هرگز UUID/Password/Certificate/Reality Data ساخته نشود |
| **Converter** | Round-Trip Integrity (URL↔UNM↔URL, JSON↔UNM↔JSON) | بدون Data Loss حیاتی |
| **Analyzer** | تشخیص صحیح و گزارش یکسان | ورودی یکسان = خروجی یکسان |
| **Worker** | ایمنی همزمانی، یکپارچگی پیام | تست Parallel Processing، Restart، Failure Recovery |
| **State** | ثبات State، آپدیت Reactive، رعایت Immutability | تست Concurrent Updates، Undo Simulation، Large Dataset |
| **Storage** | ماندگاری، یکپارچگی، بازیابی | تست Browser Restart، DB Upgrade، Corrupted Record |
| **Render** | کارایی، ثبات، ایمنی حافظه | تست با 100 / 1,000 / 10,000 نود — بدون UI Freeze |
| **Export** | صحت فرمت‌ها | خروجی باید قابل Re-import صحیح باشد |
| **Security** | XSS، Injection، داده مخرب، Encoding شکسته، فایل بزرگ | بدون آسیب‌پذیری حیاتی شناخته‌شده |
| **Compatibility** | پلتفرم‌ها و مرورگرها | Android, Windows, Linux, MacOS / Chrome Stable, Firefox Stable, Edge Stable, Samsung Internet, **Android WebView** |

### Testing Infrastructure *(جدید — بازبینی نهایی؛ باید قبل از Phase 1 Setup شود)*

**Status:** REQUIRED

> ⚠️ **گلوگاه واقعی:** محیط‌های Unit Test معمول (Vitest/Jest، طبق Candidate List سند 14) به‌صورت پیش‌فرض نه DOM دارند، نه Web Worker API، نه IndexedDB. بدون این زیرساخت، تست‌های دسته‌ی **Worker** و **Storage** (بالا) عملاً قابل‌اجرا نیستند مگر با باز کردن مرورگر واقعی — که سرعت توسعه را به‌شدت پایین می‌آورد.

**ابزارهای الزامی (در کنار Testing Framework اصلی):**
- `fake-indexeddb` — برای تست `core/store/` و Storage Layer بدون مرورگر واقعی
- یک Worker Mock/Polyfill مناسب محیط تست انتخابی (مثلاً اجرای منطق Worker به‌صورت مستقیم در تست، بدون شبیه‌سازی کامل Thread جداگانه) — برای تست منطق Parser/Analyzer که قرار است در Worker اجرا شود

> این ابزارها همراه با انتخاب نهایی Testing Framework (سند 14) تأیید می‌شوند، نه جدا.

### Browser Compatibility Matrix *(دقیق‌سازی — پیشنهاد بازبینی)*

> 🔗 **توجه ویژه:** Android WebView باید جدا از Chrome تست شود، چون نسخه‌ی WebView روی گوشی‌های مختلف می‌تواند عقب‌تر از Chrome باشد و رفتار متفاوتی (به‌خصوص در IndexedDB و Web Workers) نشان دهد — این نکته با توجه به اولویت P1 پروژه (سند IMPLEMENTATION_BLUEPRINT: Android) اهمیت بالایی دارد.

---

## 8. Performance Testing Targets

| تعداد نود | زمان هدف |
|---|---|
| 100 | < 0.5 sec |
| 1,000 | < 3 sec |
| 10,000 | < 20 sec |

مصرف حافظه باید پایدار بماند.

### UI Responsiveness Test *(جدید — پیشنهاد بازبینی، در زمان بررسی سند 10 ثبت شد)*

> یکی از KPIهای اصلی پروژه: حتی در بدترین حالت پردازش، UI نباید Freeze شود.

**مثال تست:**
```
10,000 Node Parse → UI remains interactive
```

**معیار قبولی:** در طول کل عملیات Import/Parse/Analyze روی ۱۰,۰۰۰ نود، رابط کاربری باید به تعامل کاربر (Scroll, Click, Tap) پاسخ بدهد — بدون نیاز به انتظار برای پایان عملیات Worker (طبق سند 10).

### Memory Leak Test Suite *(جدید — پیشنهاد بازبینی)*

> به‌خاطر ریسک تجمعی Memory Leak در چهار نقطه‌ی پرخطر پروژه (Worker Pool، IndexedDB، Virtual List، Subscription بزرگ)، یک بخش مستقل تست لازم است:

| تست | هدف |
|---|---|
| 10,000 Node Import | بررسی رشد غیرعادی Heap |
| 10,000 Node Scroll | بررسی Memory Leak در Virtual List |
| 100 Repeated Imports | بررسی Detached DOM / Listener باقی‌مانده (سند 13) |
| Worker Restart Cycles | بررسی Leak در Worker Manager (سند 10) |
| IndexedDB Stress Test | بررسی پایداری حافظه در ذخیره/بازیابی حجیم (سند 14) |

---

## 9. Regression Testing

**قانون:** هر باگ رفع‌شده، یک Test Case دائمی ایجاد می‌کند تا دوباره رخ ندهد.

---

## 10. Release Validation Gates

| Gate | الزام |
|---|---|
| Alpha | Core Tests Pass |
| Beta | Core + Performance Tests Pass |
| Release Candidate | All Major Categories Pass |
| Stable | All Tests Pass, No Critical Failures |

---

## 11. Failure Classification

| سطح | نمونه |
|---|---|
| **Critical** | Data Loss, Security Failure, Crash |
| **Major** | Wrong Conversion, Broken Parsing, Worker Failure |
| **Minor** | UI Defect, Cosmetic Issue |

---

## 12. Exit Criteria

پروژه «Stable» تلقی می‌شود فقط زمانی که:

- All Critical Tests Pass
- All Regression Tests Pass
- All Release Gates Pass

---

## 13. Document Control

| Field | Value |
|---|---|
| نسخه | v1.5 |
| اصلاحات نسبت به v1.4 | (بازبینی نهایی) افزودن Testing Infrastructure (fake-indexeddb + Worker Mock) — باید قبل از Phase 1 Setup شود، وگرنه تست Worker/Storage عملاً غیرممکن می‌شود |
| اصلاحات نسبت به v1.3 | (بازبینی اولویت ۲) بدون تغییر ساختاری — دو نکته‌ی بازبینی (Versioning Test Gap، Dataset Size) بررسی شد و قبلاً به‌درستی به‌عنوان «نیاز به سند/رشد آینده» مشخص شده بودند؛ نیازی به اقدام فوری نبود |
| 💭 پیشنهادهای بزرگ‌تر (موکول‌شده به بعد از اتمام بازبینی کامل ۱۹ فایل) | UNM Versioning Policy، ADR Registry، Error Code Registry — این‌ها سند جدید نیاز دارند، نه اصلاح این فایل |
| سند بعدی | `ANTI_CHAOS_BLUEPRINT` |
