# BLUEPRINT 08 — EXPORT ENGINE

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — تفکیک Future Exports به Backlog |
| **Priority** | HIGH |
| **وابسته به** | 05-UNIVERSAL_NODE_MODEL, 06-ANALYZER_ENGINE (برای Converter Engine) |

> ⚠️ **تغییر نسبت به نسخه‌ی اصلی:** بخش «Future Exports» (PDF, Excel, Markdown, Portable Package) به Backlog منتقل شد. بقیه‌ی محتوا بدون تغییر منطقی باقی مانده است.

## Mission

> Export Anything, Lose Nothing

---

## 1. Export Categories (Spec قطعی)

Single Node · Multiple Nodes · Subscription · Analysis Report · Project Snapshot

### Round-Trip Compatibility — Status: REQUIRED *(ارتقا یافته — بازبینی نهایی)*

> ⚠️ **اصلاح نسبت به نسخه‌ی قبلی:** این مفهوم قبلاً فقط یک «یادآوری آینده برای یک سند مستقل» بود. در بازبینی نهایی مشخص شد این یک **Feature Critical** است که از قبل هم در `09-DEVELOPMENT_ROADMAP` (Phase 7 — Converter Engine، Success Criteria: «Round-Trip Conversion Success») پیش‌بینی شده بود — فقط در سند Export به آن ارجاع داده نشده بود.

**قانون:** برای JSON و TXT/URL Export (که قابل Re-import هستند)، چرخه‌ی `Export → Import → UNM` باید دقیقاً همان نود اصلی (با احتساب `originalMappings`، سند 05) را بازسازی کند — بدون Data Loss در فیلدهای Core.

**محدوده‌ی واقع‌گرایانه:** این الزام فقط برای فرمت‌هایی معنا دارد که قرار است دوباره Import شوند (JSON/TXT/URL/ZIP)، نه برای خروجی‌های یک‌طرفه مثل HTML Report یا QR Code (که برای نمایش/اشتراک‌گذاری‌اند، نه Re-import).

**محل تست:** این الزام در سند `15-TESTING_FRAMEWORK` (دسته‌ی Converter، «Round-Trip Integrity») پوشش داده می‌شود — تست‌های آن باید شامل چرخه‌ی کامل Export ZIP (با `manifest.json`) هم بشوند، نه فقط تبدیل Node-level.

---

## 2. TXT Export
پشتیبانی: VLESS, VMESS, Trojan, SS, TUIC, Hysteria2, WireGuard, Mixed Lists

## 3. JSON Export
Xray JSON · Sing-box JSON · Normalized JSON · Analysis JSON

## 4. YAML Export
Clash · Clash Meta · Mihomo · Provider Files

## 5. CSV Export
ستون‌ها: Protocol, Address, Port, Remark, Security, Network, Validation Status

## 6. QR Export
Single Node · Multi QR Pages · Printable Sheets

## 7. ZIP Export
Full Project · Reports · Nodes · Logs · Backups

### Manifest File *(جدید — پیشنهاد بازبینی)*

> هر ZIP باید یک `manifest.json` داشته باشد که شامل:

- Export Version
- Export Date
- Node Count
- UNM Version

> الان اجباری نیست، ولی برای Migration در نسخه‌های بعدی پروژه ارزش زیادی دارد.

## 8. HTML Report Export
Summary, Analysis, Security Report, Compatibility Report, Warnings, Recommendations

---

## 9. Export Validation Pipeline

```
Before Export → Validate → Normalize → Verify → Package → Generate
```

> 💡 **یادداشت برای آینده (پیشنهاد بازبینی):** در نسخه‌های بعدی، یک مرحله‌ی اختیاری `Preview` می‌تواند بین `Verify` و `Package` اضافه شود تا کاربر قبل از تولید فایل نهایی، خروجی را ببیند. الان ضروری نیست.

## 10. Export Metadata
Version, Date, Parser Version, Analysis Version, Source Count, Warnings

---

## 11. Security Layer — Status: MANDATORY

| | |
|---|---|
| XSS Protection | Required |
| HTML Reports | Must Be Sanitized |
| All Text Fields | Must Be Escaped |
| User Content | Never Render Directly |

**مجاز:** Escaped Content, Sanitized Content
**ممنوع:** Raw HTML Injection, Raw Script Injection, Raw User Markup

**ابزار پیشنهادی:** DOMPurify یا معادل آن

### Content Security Rules *(جدید — پیشنهاد بازبینی)*

- Escape Before Render
- Sanitize Before Export
- Never Trust User Input

---

## 12. Export Profiles
Quick Export · Standard Export · Advanced Export · Developer Export

---

## 13. Backlog — Future Exports

> ایده برای آینده، بدون Spec فعلی:

- PDF Report
- Excel Workbook
- Markdown Report
- Portable Project Package

---

## 14. Document Control

| Field | Value |
|---|---|
| نسخه | v1.3 |
| اصلاحات نسبت به v1.2 | (بازبینی نهایی) ارتقای Round-Trip Compatibility از «یادآوری آینده» به Requirement رسمی، با اتصال به Success Criteria موجود در Phase 7 سند 09 و محل تست در سند 15 |
| اصلاحات نسبت به v1.1 | (بر اساس بازبینی مهدی) افزودن Manifest File به ZIP Export؛ افزودن Content Security Rules؛ یادداشت Optional Preview Stage |
| سند بعدی | `09-BLUEPRINT_DEVELOPMENT_ROADMAP` |
