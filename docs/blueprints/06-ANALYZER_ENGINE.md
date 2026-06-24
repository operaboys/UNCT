# BLUEPRINT 06 — ANALYZER ENGINE

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — تفکیک فاز، بدون حذف فیچر |
| **Priority** | HIGH |
| **وابسته به** | 05-UNIVERSAL_NODE_MODEL (پر کردن `AnalysisObject`) |

> ⚠️ **تغییر نسبت به نسخه‌ی اصلی:** ماژول‌های Analyzer به دو دسته‌ی **Spec قطعی (فاز نزدیک)** و **نیمه‌قطعی (فاز بعدی)** تقسیم شدند — هم‌راستا با تفکیکی که در سند `03-FEATURE_MATRIX` انجام شد. دلیل: ماژول‌هایی مثل Cloudflare/Worker Analyzer به استخراج پیچیده‌تر (decode چندلایه Base64/Payload) نیاز دارند و باید بعد از تثبیت Analyzer پایه ساخته شوند.

## Mission

> فقط تبدیل نکن. بفهم.

---

## 1. Spec قطعی (فاز نزدیک)

### 1.0 Data Completeness Analyzer *(جدید — بازبینی نهایی؛ ترفیع‌یافته از Backlog)*

> ⚠️ **چرا این ماژول باید Spec قطعی باشد، نه Backlog:** ماژول‌های ۱.۲ تا ۱.۵ (به‌خصوص Security Analyzer) نمی‌توانند امتیاز درست بدهند بدون دانستن این‌که چه فیلدهایی «مفقود» هستند. مثلاً `sni` خالی بودن یک Validation Error نیست (چون اختیاری است)، ولی Security Score را به‌شدت پایین می‌آورد. این تفاوت بین «نامعتبر» و «مفقود» باید جایی محاسبه شود.

**مسئولیت:** فقط بررسی Data Completeness — نه اعتبارسنجی مقدار (وظیفه‌ی Validation Engine، سند 04) و نه امتیازدهی (وظیفه‌ی Security/Reality Analyzer).

**خروجی:**
```typescript
interface CompletenessResult {
  missingFields: string[];       // مثل ["sni", "alpn"]
  presentOptionalFields: string[];
  completenessScore: number;     // 0-100، صرفاً درصد پر بودن فیلدهای مرتبط با Protocol/Security
}
```

**قانون مصرف:** سایر ماژول‌ها (مثل Security Analyzer) به‌جای چک کردن مستقیم تک‌تک فیلدها، فقط به خروجی همین ماژول (`missingFields`) رجوع می‌کنند — این از تکرار منطق «آیا فیلد X خالی است» در چند Analyzer مختلف جلوگیری می‌کند.

> 🔗 این نسخه‌ی **سبک‌شده‌ی** ایده‌ی اصلی Normalization Analyzer (که در نسخه‌ی قبلی این سند در Backlog بود) است — فقط Data Completeness، نه تحلیل کامل Normalization.

### 1.1 Protocol Analyzer
تشخیص: VLESS, VMESS, Trojan, SS, TUIC, Hysteria2, WireGuard

> 🔗 **مرز مهم (پیشنهاد بازبینی):** «Protocol» اینجا با «Format» در `04-PARSER_ENGINE` اشتباه گرفته نشود. `Xray JSON` یک **Format** است (تشخیص آن وظیفه‌ی Format Detector در Parser Engine است)؛ `VLESS` یک **Protocol** است (تشخیص آن وظیفه‌ی همین Protocol Analyzer است، روی داده‌ی UNM، نه روی فایل خام). این دو مفهوم باید همیشه جدا بمانند.

### 1.2 Security Analyzer
امتیازدهی بر اساس: TLS, Reality, Encryption, Fingerprint, ALPN, Flow, PBK, SID + خروجی Data Completeness Analyzer (بخش 1.0)
**خروجی:** Security Score (0–100)

### 1.3 TLS Analyzer
بررسی صحت تنظیمات TLS (SNI/ALPN/Fingerprint سازگار با Security Type)

### 1.4 Network Analyzer
بررسی سازگاری Network Type (ws/grpc/tcp/...) با Protocol انتخاب‌شده

### 1.5 Reality Analyzer
استخراج و اعتبارسنجی: PBK, SID, Fingerprint, SNI, ALPN → **Reality Compatibility**

> 🔗 **یادآوری (پیشنهاد بازبینی):** `Reality Compatibility` باید همیشه از `Security Score` جدا بماند — این دو معیار متفاوت هستند: یک نود می‌تواند **Secure** باشد ولی با یک کلاینت خاص **Compatible** نباشد (یا برعکس). در `AnalysisObject` (سند 05) این دو از قبل به‌صورت فیلدهای جدا تعریف شده‌اند (`securityScore` در برابر `compatibilityScore`)، فقط این مرز در پیاده‌سازی واقعی Analyzer هم باید رعایت شود.

---

## 2. نیمه‌قطعی (فاز بعدی — بعد از تثبیت بخش ۱)

### 2.1 Cloudflare Analyzer
تشخیص: Cloudflare IP, Cloudflare Domain, Cloudflare Worker, Cloudflare Pages, Cloudflare Tunnel, Cloudflare CDN

### 2.2 Worker Analyzer
استخراج: Workers Domains, Workers Paths, Workers Parameters, Workers Encoded Data

### 2.3 Clean IP Analyzer
استخراج: IPv4, IPv6, Embedded Lists, Encoded Lists, Base64 Payloads, Worker Payloads

### 2.4 DNS Analyzer
تشخیص: Local DNS, Remote DNS, DoH, DoT, FakeDNS → Leak Risk

> 🔗 **تعریف دقیق Leak Risk (پیشنهاد بازبینی):** برای جلوگیری از برداشت متفاوت توسعه‌دهندگان، مقیاس از قبل در `AnalysisObject` (سند 05) به‌صورت Enum ثابت شده: `dnsLeakRisk: "none" | "low" | "medium" | "high"`. این Analyzer باید دقیقاً همین چهار مقدار را تولید کند، نه یک عدد یا مقیاس دیگر.

### 2.5 Subscription Analyzer
Total Nodes, Protocol Distribution, Duplicate Nodes, Invalid Nodes, Dead Nodes Candidate, Security Ranking

> این مورد به مجموعه‌ای از Nodeها (نه یک Node تنها) عمل می‌کند و طبیعتاً پس از تکمیل Subscription Parser معنا پیدا می‌کند.

### 2.6 Compatibility Analyzer

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (پیشنهاد بازبینی):** این ماژول قبلاً دو مفهوم متفاوت را با هم قاطی می‌کرد. الان به دو زیر‌بخش تفکیک شده:

**Platform Compatibility** *(سیستم‌عامل)*
Android, iOS, Windows, Linux, MacOS

**Client Compatibility** *(نرم‌افزار کلاینت)*
Xray, Sing-box, Clash Meta, Nekobox, v2rayNG, Hiddify

### 2.7 Performance Analyzer
*(در نسخه‌ی اصلی فقط اسم برده شده بود — جزئیات این ماژول هنوز Spec ندارد و باید قبل از پیاده‌سازی نوشته شود.)*

### 2.8 ~~Normalization Analyzer~~ *(ترفیع‌یافته — بازبینی نهایی)*

> این مورد دیگر در Backlog نیست. نسخه‌ی سبک‌شده‌ی آن به‌عنوان **Data Completeness Analyzer** (بخش 1.0، بالای همین سند) به Spec قطعی منتقل شد.

---

## 3. Risk Scoring (مشترک بین همه‌ی ماژول‌ها)

| بازه | سطح |
|---|---|
| 0–20 | Excellent |
| 21–40 | Good |
| 41–60 | Average |
| 61–80 | Poor |
| 81–100 | Critical |

> ⏳ **Flag باز (بازبینی اولویت ۲ — باید قبل از شروع Phase 6 مشخص شود، نه الان):** جدول بالا فقط خروجی نهایی `riskScore` را طبقه‌بندی می‌کند، ولی **فرمول تولید `riskScore` هنوز تعریف نشده** (مثلاً چه درصدی از Security/Compatibility/DNS/Reality در آن سهیم است). الان برای Phase 1 تا 5 مشکلی ایجاد نمی‌کند، چون `riskScore` هنوز محاسبه نمی‌شود؛ ولی این فرمول باید قبل از پیاده‌سازی واقعی Phase 6 (سند 09) به‌صورت دقیق نوشته شود — احتمالاً به‌عنوان یک Section مجزا در همین سند، نه الان.

---

## 4. Final Report (خروجی مشترک)

- Summary
- Warnings
- Recommendations
- Conversion Possibilities
- Optimization Suggestions
- Security Suggestions
- Compatibility Suggestions

---

## 5. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) ترفیع Normalization Analyzer از Backlog به Spec قطعی، به‌صورت سبک‌شده با نام «Data Completeness Analyzer» (بخش 1.0) — چون Security/Reality Analyzer بدون اطلاع از فیلدهای مفقود نمی‌توانند امتیاز درست بدهند |
| سند بعدی | `07-BLUEPRINT_UI_UX_SYSTEM` |
