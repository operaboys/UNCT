# BLUEPRINT 04 — PARSER ENGINE

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | FOUNDATION MODULE — بدون تغییر منطقی، فقط بازآرایی |
| **Priority** | CRITICAL |
| **وابسته به** | 01-MASTER_BLUEPRINT, 05-UNIVERSAL_NODE_MODEL, 12-PARSER_FACTORY |

---

## 1. Mission

تبدیل هر ورودی معتبر یا نیمه‌معتبر به ساختار استاندارد داخلی سیستم (**UNM**).
تمام ماژول‌های پروژه به خروجی Parser وابسته‌اند. هیچ ماژولی نباید مستقیماً روی فایل خام کار کند.

## 2. Parser Philosophy

ورودی هرگز قابل اعتماد نیست. Parser باید:

- **Fault Tolerant**
- **Recoverable**
- **Extensible**
- **Self Diagnosing**

---

## 3. Parser Flow

```
Raw Input → Preprocessor → Format Detector → Parser Selection → Field Extraction
          → Error Recovery → Fuzzy Recovery → Validation → Normalization → UNM
```

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (بر اساس بازبینی مهدی):** Flow اصلی قبلاً با مراحل واقعی توضیح‌داده‌شده در ادامه‌ی همین سند (Stage 10: Error Recovery، Stage 11: Fuzzy Recovery) همخوانی نداشت. الان این دو مرحله به‌صراحت در نمودار اصلی دیده می‌شوند.

---

## Stage 01 — Preprocessor

**هدف:** پاکسازی داده‌ها قبل از پردازش

**عملیات:**
- Normalize Persian/Arabic-Indic Digits to ASCII *(جدید — افزوده‌شده طبق تصمیم دوزبانه‌سازی پروژه)*
- Normalize Arabic Letter Forms to Persian Forms *(جدید — افزوده‌شده طبق تصمیم دوزبانه‌سازی پروژه)*
- Trim
- Normalize Line Endings
- Remove BOM
- Fix UTF-8 Issues
- Repair Broken Base64
- Remove Invisible Characters
- Repair URL Encoding
- Remove Duplicate Whitespace

**خروجی:** Clean Text · Metadata · Warnings

> 🔢 **Normalize Persian/Arabic-Indic Digits to ASCII** *(جدید)*: هر رقم فارسی (۰۱۲۳۴۵۶۷۸۹) و
> عربی (٠١٢٣٤٥٦٧٨٩) در متن خام، پیش از هر عملیات دیگر همین Stage، به معادل ASCII (`0-9`) تبدیل
> می‌شود. دلیل قرارگرفتن در همین جای اول Stage 01: هر چهار مسیر ورودی (Paste, Upload, Drag-Drop,
> Clipboard — سند ۰۷ بخش ۴.۲) به این یک نقطه‌ی مشترک می‌رسند؛ نرمال‌سازی اینجا یعنی Stageهای بعدی
> (Format Detector, Field Extraction, Validation) همیشه فقط رقم ASCII می‌بینند، بدون نیاز به
> پوشش‌دادن این تفاوت در هر Parser/Validator جدا.
>
> 🔤 **Normalize Arabic Letter Forms to Persian Forms** *(جدید)*: حروف هم‌شکل عربی به معادل فارسی
> خودشان تبدیل می‌شوند (مثلاً `ي` (Arabic Yeh, U+064A) → `ی` (Persian Yeh, U+06CC)؛ `ك` (Arabic
> Kaf, U+0643) → `ک` (Persian Kaf, U+06A9)). دلیل: این حروف از نظر بصری تقریباً یکسان‌اند ولی
> Codepoint متفاوت دارند؛ بدون این نرمال‌سازی، Search/Filter روی Remark یا سایر متن‌های آزاد
> (سند ۰۷ بخش ۴.۴ — Subscription Center) می‌تواند به‌خاطر این تفاوت نامرئی، بی‌صدا نتیجه‌ی غلط
> بدهد (False Negative در نتیجه‌ی جستجو) — یک کلاس باگ واقعی و سندشده در پروژه‌های مشابه.

---

## Stage 02 — Format Detector

تشخیص نوع ورودی از میان فرمت‌های پشتیبانی‌شده (Xray JSON، Sing-box JSON، Clash/Clash Meta YAML، Base64 Subscription، VLESS/VMESS/Trojan/SS/Hysteria2/TUIC URL، WireGuard، TXT Bundle، ZIP Package).

**سیستم اطمینان (Confidence System):** هر تشخیص باید امتیاز داشته باشد.
> مثال: `Xray JSON → Confidence: 97%`

**Fallback Detection:** در صورت Confidence < 50% → `Unknown Format` → نیاز به بررسی دستی.

### Detection Metadata *(جدید — پیشنهاد بازبینی)*

هر تشخیص باید همراه با متادیتای زیر ثبت شود تا در Debug Console قابل بررسی باشد:

- Detected Format
- Confidence Score
- Detection Reason (چه الگویی باعث این تشخیص شد)
- Alternative Candidates (سایر فرمت‌های کاندید با امتیاز کمتر)

**مثال:**
```
Detected: Xray JSON
Confidence: 97%
Alternatives: Sing-box 41%, Clash 12%
```

> ⚡ **Lazy Alternative Detection (جدید — بازبینی نهایی، Performance):** محاسبه‌ی `Alternative Candidates` نباید همیشه همه‌ی Parserهای دیگر را اجرا کند — این کار برای ورودی‌هایی با Confidence بالا (مثل ۹۷٪) هدررفت محاسباتی بی‌دلیل است. **قانون:** `Alternative Candidates` فقط وقتی محاسبه می‌شود که `Confidence < 80%` باشد؛ در غیر این صورت فقط Format برنده ثبت می‌شود.

---

## Stage 03 — Parser Router

```
Input → [Xray | Sing-box | Clash | URL | Subscription | WireGuard] Parser
```

انتخاب Parser بر اساس بالاترین Confidence Score (جزئیات الگوریتم در سند `12-PARSER_FACTORY`).

---

## Stage 04 — Xray Parser  *(Priority: Highest)*

**ساختارهای پشتیبانی‌شده:** Outbound-Based · Inbound-Based · Multi-Outbound · Multi-User · Reality · TLS · WS · gRPC · HTTPUpgrade · TCP · KCP · QUIC · XHTTP

**فیلدهای استخراجی:** Protocol, Address, Port, UUID, Password, Encryption, Security, Network, Host, Path, SNI, ALPN, Fingerprint, PBK, SID, Flow, Remark, Tag

**مدیریت ویژه:** تشخیص DNS Address در برابر Server Address — جلوگیری از اشتباه گرفتن DNS با Node.

---

## Stage 05 — Sing-box Parser

**انواع پشتیبانی‌شده:** VLESS, VMESS, Trojan, Shadowsocks, TUIC, Hysteria2, WireGuard

**نسخه‌ها:** Legacy · Current Stable · Future Compatible

**تشخیص هوشمند ساختار:** Server, Servers, Endpoints, Peers, Selectors, Groups

---

## Stage 06 — Clash Parser

**پشتیبانی:** Clash Premium, Clash Meta, Mihomo, OpenClash, MetaCubeX

**استخراج:** Proxy, Proxy Group, Rule, DNS, Profile, Provider

---

## Stage 07 — URL Parser

**اسکیم‌های پشتیبانی‌شده:** `vless://` `vmess://` `trojan://` `ss://` `hysteria2://` `tuic://` `wireguard://`

**رمزگشایی:** URL Parameters · Encoded Paths · Base64 Segments · Reality Parameters

---

## Stage 08 — Subscription Parser

**ورودی‌ها:** Base64, TXT, Mixed Protocols, Remote Lists, Local Lists

**قابلیت‌ها:** Auto Decode · Auto Split · Auto Deduplicate · Auto Validate · Auto Normalize

---

## Stage 09 — WireGuard Parser

**استخراج:** Private Key, Public Key, Endpoint, Allowed IPs, DNS, MTU, Persistent Keepalive

---

## Stage 10 — Error Recovery Engine

**مأموریت:** نجات اطلاعات حتی از فایل‌های خراب.

**خطاهای قابل‌بازیابی:** Broken JSON, Broken YAML, Broken URL, Broken Base64, Broken Encoding, Partial Config

**استراتژی:** Recover Maximum Data · Never Fail Immediately · Generate Warning · Continue Parsing

---

## Stage 11 — Fuzzy Recovery Layer

**Status:** APPROVED
**هدف:** Recover Structure — **Never Invent Security Data**

**قابلیت‌ها:** Typo Detection, Levenshtein Matching, Regex Heuristics, Partial Structure Recovery, Broken Key Recovery, Confidence-Based Recovery

**مثال:** `usreid → userid` | `servr → server`

**قوانین بازیابی:** Recover Structure · Recover Metadata · Recover Formatting

**ممنوعیت‌های مطلق:**
- ❌ Invent UUID
- ❌ Invent Password
- ❌ Invent Public/Private Keys
- ❌ Invent Reality Data

> **اصل امنیتی:** Recover Maximum Data, Never Fabricate Security Data.

> 🔗 **مرز Recovery در برابر Validation** (تصمیم تکمیلی): Recovery فقط روی *Structure/Syntax* کار می‌کند (تشخیص نام فیلد، ترمیم فرمت). Validation فقط روی *Semantic/Security* کار می‌کند (آیا مقدار معتبر است). این دو هرگز نباید در منطق با هم تداخل کنند.

---

## Stage 12 — URL Preprocessing Layer

**Status:** REQUIRED
**هدف:** Normalize URLs Before Parsing

**مسئولیت‌ها:** Escape Reserved Characters · Normalize Encodings · Validate URL Structure · Prepare Input For URL Parser

**فیلدهای محافظت‌شده:** Username, Password, UUID, Path, Query Parameters

**اسکیم‌های پشتیبانی‌شده:** VLESS, VMESS, TROJAN, TUIC, HY2, WIREGUARD

**قانون:** هیچ URL خامی نباید بدون Preprocessing به URL Parser برسد.

---

## Stage 13 — Validation Engine

**انواع اعتبارسنجی:** UUID, Port, Domain, IP, Reality, TLS, ALPN, URL

### Cross-Field Validation *(جدید — پیشنهاد بازبینی)*

> بعضی خطاها فقط با بررسی همزمان چند فیلد کشف می‌شوند، نه با بررسی تک‌فیلدی.

**مثال‌ها:**
- Reality Requires PBK *(اگر Security = reality باشد، PBK نباید خالی باشد)*
- TLS Requires Server Name *(اگر Security = tls باشد، SNI باید مقداردهی شده باشد)*
- WireGuard Requires Endpoint

**سطوح شدت:** `INFO` → `WARNING` → `ERROR` → `CRITICAL`

### Validation Scope Rule *(جدید — بازبینی نهایی)*

> ⚠️ **رفع ابهام معماری:** چون Cross-Field Validation نیاز به مقایسه‌ی هم‌زمان چند فیلد دارد (مثل Reality↔PBK)، Validation Engine **نمی‌تواند Field-by-Field کار کند**. قانون رسمی: Validation همیشه **Node-by-Node** اجرا می‌شود — کل `UNMNode` (نه یک فیلد منفرد) به Validation Engine پاس داده می‌شود و خروجی یک `ValidationObject` کامل است (طبق سند 05)، نه یک نتیجه‌ی پراکنده به‌ازای هر فیلد.

---

## Stage 13.1 — Normalization Mapping Table *(جدید — بازبینی نهایی)*

**Status:** REQUIRED
**هدف:** قبل از تولید UNM (Stage 14)، مقادیر استخراج‌شده باید به Enumهای استاندارد سند ۰۵ نگاشت شوند — نه فقط نام فیلدها (که `originalMappings` پوشش می‌دهد، سند 05)، بلکه **مقادیر** هم باید Normalize شوند.

**مثال واقعی:** فرمت‌های مختلف برای یک مفهوم، مقادیر متفاوتی می‌نویسند:

```typescript
const networkTypeMapping: Record<string, NetworkType> = {
  'ws': 'ws', 'websocket': 'ws',
  'grpc': 'grpc',
  'httpupgrade': 'http-upgrade', 'http-upgrade': 'http-upgrade',
  'tcp': 'tcp', 'kcp': 'kcp', 'quic': 'quic', 'xhttp': 'xhttp',
};
```

**قانون:** هر Parser مسئول است مقادیر خام خودش را از طریق این Mapping Table عبور دهد؛ اگر مقداری در جدول نبود، باید به‌جای Crash، در `metadata.warnings` ثبت شود و مقدار پیش‌فرض پروتکل اعمال شود (طبق Stage 10 — Error Recovery Engine).

> 🔗 این Mapping Table مکمل `originalMappings` (سند 05) است، نه جایگزین آن: `originalMappings` نام فیلد را ردیابی می‌کند، این Stage مقدار فیلد را استاندارد می‌کند.

---

## Stage 14 — Universal Node Model (UNM)

تمام Parserها باید خروجی را به این ساختار تبدیل کنند (جزئیات کامل در سند `05-UNIVERSAL_NODE_MODEL`):

**Core Fields:** NodeID, SourceType, Protocol, Address, Port, UUID, Password, Method, Encryption, Security, Network, Host, Path, SNI, ALPN, Fingerprint, PBK, SID, Flow, Remark, Tags

**Runtime/Extension Objects** *(اصلاح‌شده — بر اساس بازبینی مهدی روی فایل ۰۵):* `metadata` (شامل `originalMappings`)، `validation` (الزامی)، `analysis` (اختیاری)، `conversion` (اختیاری)

> ⚠️ **رفع تناقض:** نسخه‌ی قبلی این Stage، `ValidationStatus` و `RiskScore` را در کنار فیلدهای Core (مثل `Protocol`, `Address`) به‌صورت یک لیست تخت می‌آورد — که با تفکیک Core Data / Runtime Data در سند ۰۵ (`validation` و `analysis` به‌عنوان آبجکت‌های جدا) در تناقض بود. این Stage الان دقیقاً همان ساختار سند ۰۵ را منعکس می‌کند.

---

## 4. Parser Performance Targets

| تعداد کانفیگ | زمان هدف |
|---|---|
| 1 Config | < 50 ms |
| 100 Configs | < 500 ms |
| 1,000 Configs | < 3 sec |
| 10,000 Configs | < 20 sec |

---

## 5. Parser Success Definition

- هیچ داده‌ای نباید بدون دلیل از دست برود.
- هر داده‌ای که قابل بازیابی باشد باید استخراج شود.
- هر داده‌ای که استخراج نشود باید علت آن در Debug Console ثبت شود.
- **Parser نباید حدس بزند. Parser باید اثبات کند.**

---

## 6. Document Control

| Field | Value |
|---|---|
| نسخه | v1.5 |
| اصلاحات نسبت به v1.4 | (دوزبانه‌سازی پروژه) افزودن دو قانون به Stage 01 — Preprocessor: نرمال‌سازی ارقام فارسی/عربی به ASCII (قبل از هر عملیات دیگر)، و نرمال‌سازی حروف عربی به فرم فارسی معادل (جلوگیری از شکست خاموش Search/Filter) |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) افزودن Lazy Alternative Detection (Performance)؛ افزودن Validation Scope Rule (Node-by-Node بودن اجباری)؛ افزودن Stage 13.1 Normalization Mapping Table |
| ✅ Flag بسته‌شده | `ValidationStatus`/`RiskScore` دیگر فیلد تخت UNM نیستند؛ داخل `validation`/`analysis` objects هستند (طبق سند 05) |
| سند بعدی | `05-BLUEPRINT_UNIVERSAL_NODE_MODEL` |
