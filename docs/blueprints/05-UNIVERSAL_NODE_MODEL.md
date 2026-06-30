# BLUEPRINT 05 — UNIVERSAL NODE MODEL (UNM)

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | CORE DATA STANDARD — مهم‌ترین سند پروژه |
| **Version** | 1.1 (دقیق‌سازی Schema — بدون افزودن فیلد جدید) |
| **وابسته به** | هیچ‌چیز (مطابق قانون: UNM به هیچ‌چیز وابسته نیست) |

> ⚠️ **هدف این بازنویسی:** نسخه‌ی قبلی فقط اسم فیلدها را فهرست می‌کرد. این نسخه برای هر فیلد **نوع داده (Type)**، **الزامی/اختیاری بودن**، و **مقادیر مجاز (Enum)** را مشخص می‌کند تا اولین قطعه‌ی قابل‌اجرا (Schema واقعی) باشد. هیچ فیلدی حذف یا اضافه نشده است.

---

## 1. Purpose

ایجاد یک زبان مشترک بین تمام Parserها و Converterها — معادل **AST در کامپایلرها**.

**اهداف:**
- Decouple System Components
- Reduce Dependency Complexity
- Provide Single Source Of Truth

**قانون مطلق:** All System Components Operate On UNM. هیچ کامپوننتی (جز Importer و Parser) حق دسترسی به Raw Input ندارد.

---

## 2. Node Object — Schema دقیق

```typescript
interface UNMNode {
  // ===== شناسایی =====
  nodeId: string;              // الزامی — UUID v4 یکتا، تولید داخلی سیستم (نه از ورودی)
  sourceType: SourceType;      // الزامی — از کجا parse شده
  sourceVersion?: string;      // اختیاری — مثلاً نسخه‌ی فرمت Sing-box

  // ===== هویت پروتکل =====
  protocol: Protocol;          // الزامی
  address: string;             // الزامی — Domain یا IP (هرگز DNS Address!)
  port: number;                // الزامی — 1-65535

  // ===== احراز هویت =====
  uuid?: string;                // VLESS / VMESS
  password?: string;            // Trojan / SS / Hysteria2
  method?: string;               // SS encryption method (مثل aes-256-gcm)
  encryption?: string;          // VLESS encryption (معمولاً "none")

  // ===== شبکه و امنیت =====
  network: NetworkType;         // الزامی — پیش‌فرض "tcp"
  security: SecurityType;       // الزامی — پیش‌فرض "none"
  host?: string;                // Header Host (WS/HTTPUpgrade)
  path?: string;                 // WS/gRPC/HTTPUpgrade path
  sni?: string;                  // TLS/Reality SNI
  alpn?: string[];               // مثل ["h2", "http/1.1"]
  fingerprint?: string;          // uTLS fingerprint (chrome, firefox, ...)

  // ===== Reality =====
  pbk?: string;                  // Reality Public Key — نام استاندارد نهایی
  sid?: string;                  // Reality Short ID — نام استاندارد نهایی

  // ===== ویژگی‌های انتقال =====
  flow?: string;                 // VLESS flow (xtls-rprx-vision, ...)
  serviceName?: string;          // gRPC service name
  authority?: string;            // gRPC authority
  mode?: string;                  // gRPC mode (gun/multi)
  headerType?: string;           // TCP/KCP header obfuscation type
  earlyData?: boolean;           // WS Early Data

  // ===== متادیتای کاربری =====
  remark?: string;               // نام/برچسب نمایشی
  group?: string;                // گروه‌بندی منطقی
  tags?: string[];               // برچسب‌های آزاد

  // ===== Timestamps =====
  createdAt: string;             // ISO 8601 — الزامی، تولید داخلی
  updatedAt: string;             // ISO 8601 — الزامی، تولید داخلی

  // ===== آبجکت‌های مرتبط (جزئیات در بخش 3 تا 6) =====
  metadata: MetadataObject;       // الزامی
  analysis?: AnalysisObject;       // اختیاری — تا قبل از اجرای Analyzer خالی است
  validation: ValidationObject;    // الزامی — همیشه باید بعد از Parse اجرا شود
  conversion?: ConversionObject;   // اختیاری — تا قبل از اجرای Converter خالی است

  // ===== Plugin Extension Point =====
  extensions?: Record<string, unknown>;  // جایگزین future01-05 — Namespace آزاد برای Pluginهای آینده (سند 09، Phase 11)
                                          // مثال: { "geoip": { country: "DE" }, "latency": { ms: 120 } }
}
```

### Enum تعریف‌شده

```typescript
type SourceType =
  | "xray-json" | "singbox-json" | "clash-yaml" | "clash-meta-yaml"
  | "vless-url" | "vmess-url" | "trojan-url" | "ss-url"
  | "hysteria2-url" | "tuic-url" | "wireguard-config" | "subscription";

type Protocol =
  | "vless" | "vmess" | "trojan" | "shadowsocks"
  | "hysteria2" | "tuic" | "wireguard";

type NetworkType =
  | "tcp" | "ws" | "grpc" | "http-upgrade" | "kcp" | "quic" | "xhttp";

type SecurityType =
  | "none" | "tls" | "reality";
```

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (بر اساس بازبینی مهدی):** فیلدهای مترادف (`serverPublicKey`, `shortId`, `clientFingerprint`) به‌طور کامل از `UNMNode` حذف شدند — وجود هم‌زمان نام استاندارد (`pbk`) و نام مترادف (`serverPublicKey`) در یک Schema، تناقضی با اصل **"UNM باید Canonical Model باشد، نه Canonical + Legacy"** داشت.
>
> **قانون جدید:** Parser موظف است این مترادف‌ها را در لحظه‌ی تولید UNM یکسان‌سازی کند؛ فیلد نهایی همیشه فقط نام استاندارد (`pbk`, `sid`, `fingerprint`) را دارد. ردیابی این‌که مقدار از کدام نام مترادف استخراج شده، **فقط** در `metadata.originalMappings` ثبت می‌شود (جدول جدید، بخش ۳)، نه در خود Node Object.

> ⚠️ **Priority Chain (جدید — بازبینی نهایی):** اگر یک ورودی **هم‌زمان چند نام مترادف مختلف** برای یک مفهوم داشته باشد (مثلاً هم `publicKey` و هم `serverPublicKey`، هر دو معادل `pbk`)، Parser باید بر اساس یک **ترتیب اولویت ثابت** تصمیم بگیرد کدام مقدار برنده است — نه به‌صورت تصادفی یا بر اساس ترتیب ظهور در JSON:
>
> ```typescript
> // مثال برای pbk — هر Parser باید Priority Chain مخصوص خودش را تعریف کند
> const pbkPriority = ['publicKey', 'serverPublicKey', 'pbk'];
> // او اولین مقدار غیرخالی در این ترتیب را انتخاب می‌کند
> ```
>
> مقادیر نادیده‌گرفته‌شده (Lower Priority) همچنان در `metadata.originalMappings` با مقدارشان ثبت می‌شوند تا اطلاعات از دست نرود — فقط در فیلد نهایی استفاده نمی‌شوند.

> 🔗 **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۱):** فیلدهای رزرو `future01` تا `future05` حذف شدند و با یک فیلد واحد `extensions: Record<string, unknown>` جایگزین شدند. دلیل: فیلدهای رزروشده‌ی شماره‌دار نه Type-Safe هستند و نه خودتوضیح‌دهنده (Self-Documenting)؛ یک پلاگین که نیاز به ذخیره‌ی داده دارد باید بداند چرا باید `future03` را به‌جای `future01` انتخاب کند. `extensions` با Plugin Isolation Rule (سند 12، بخش 8.1) هم‌خوان‌تر است: هر پلاگین Namespace خودش را در `extensions` می‌نویسد، بدون برخورد با پلاگین‌های دیگر یا با UNM Core.

---

## 3. Metadata Object

```typescript
interface MetadataObject {
  parser: string;                 // نام Parser مولد (مثل "XrayParser")
  confidence: number;             // 0-100
  sourceFile?: string;            // نام فایل ورودی (در صورت وجود)
  sourceLine?: number;            // شماره خط در ورودی خام (در صورت امکان)
  formatVersion?: string;
  warnings: string[];             // هرگز null — همیشه آرایه، حتی خالی
  errors: string[];
  recoveryActions: string[];      // هر تغییری که Fuzzy Recovery انجام داده، اینجا ثبت می‌شود
  originalMappings: Record<string, string>;  // جدید — نگاشت نام مترادف ورودی به نام استاندارد UNM
                                               // مثال: { "serverPublicKey": "pbk", "shortId": "sid" }
}
```

---

## 4. Analysis Object  *(پر می‌شود توسط Analyzer Engine — سند 06)*

```typescript
interface AnalysisObject {
  riskScore: number;              // 0-100
  securityScore: number;          // 0-100
  compatibilityScore: number;     // 0-100
  cloudflareDetected: boolean;
  realityDetected: boolean;
  workerDetected: boolean;
  cleanIPDetected: boolean;
  dnsLeakRisk: "none" | "low" | "medium" | "high" | "unknown"; // ADR-022
}
```

> 💭 **یادآوری آینده — بدون اقدام فعلی (بازبینی اولویت ۱):** فیلدهای `cloudflareDetected`/`workerDetected`/`cleanIPDetected` کاملاً Feature-Specific هستند. اگر Plugin System (سند 09، Phase 11) به اندازه‌ی کافی بزرگ شود، ممکن است بهتر باشد `AnalysisObject` به‌صورت ماژولار رشد کند (مثلاً `analysis.extended.cloudflare` به‌جای فیلدهای flat). الان بحرانی نیست؛ فقط Flag می‌شود.

---

## 5. Validation Object  *(پر می‌شود توسط Validation Engine — سند 04, Stage 13)*

```typescript
interface ValidationObject {
  addressValid: boolean;
  portValid: boolean;
  uuidValid: boolean | null;       // null = این فیلد برای این پروتکل اصلاً معنا ندارد
  realityValid: boolean | null;
  tlsValid: boolean | null;
  alpnValid: boolean | null;
  pathValid: boolean | null;
  hostValid: boolean | null;
  overallValid: boolean;           // AND منطقی همه‌ی موارد بالا (با احتساب null = neutral)
}
```

> 💭 **یادآوری آینده — بدون اقدام فعلی (بازبینی اولویت ۱):** `overallValid: boolean` نمی‌تواند تفاوت بین یک Warning کوچک و یک خطای Critical را نشان دهد (مثلاً `overallValid = false` می‌تواند هم به‌خاطر یک ALPN نامعتبر باشد، هم به‌خاطر یک UUID کاملاً خراب). در نسخه‌ی بعدی، افزودن یک فیلد `validationLevel: "info" | "warning" | "error" | "critical"` پیشنهاد می‌شود. الان لازم نیست اضافه شود؛ فقط ثبت می‌شود تا فراموش نشود.

> 🔗 **مرز Recovery/Validation (یادآوری از سند 04):** این آبجکت فقط درباره‌ی *معتبر بودن مقدار* قضاوت می‌کند، نه درباره‌ی *از کجا آمدن* آن مقدار. تشخیص و ترمیم ساختار وظیفه‌ی Fuzzy Recovery Layer است، نه این بخش.

---

## 6. Conversion Object  *(پر می‌شود توسط Converter Engine — سند 02 §7)*

```typescript
interface ConversionObject {
  canConvertToVLESS: boolean;
  canConvertToVMESS: boolean;
  canConvertToTrojan: boolean;
  canConvertToSS: boolean;
  canConvertToTUIC: boolean;
  canConvertToHysteria2: boolean;
  canConvertToWireGuard: boolean;
}
```

> 💭 **یادآوری آینده — بدون اقدام فعلی (بازبینی اولویت ۱):** این ساختار برای ۷ پروتکل فعلی کافی است، اما برای Plugin System مقیاس‌پذیر نیست (هر پروتکل جدید نیاز به یک فیلد `canConvertToX` جدید در همین Interface دارد که شکل دیگری از مشکل Rule 6.1 سند 12 است). جایگزین آینده‌ی پیشنهادی: `supportedExports: string[]`. الان بحرانی نیست؛ فقط Flag می‌شود.

---

## 7. Rules (قوانین مطلق — تغییرناپذیر)

1. هیچ Converter حق ندارد مستقیماً از Parser داده بگیرد.
2. تمام ارتباط‌ها فقط از طریق UNM انجام می‌شود.
3. **UNM تنها حقیقت سیستم است.**
4. `nodeId`, `createdAt`, `updatedAt` همیشه توسط سیستم تولید می‌شوند — هرگز از ورودی خام خوانده نمی‌شوند.
5. `metadata.warnings` و `metadata.errors` هرگز `null`/`undefined` نیستند — حداقل آرایه‌ی خالی.
6. هیچ فیلد امنیتی (`uuid`, `password`, `pbk`, `sid`, و مشتقات کلید) هرگز توسط Recovery Layer ساخته نمی‌شود؛ در صورت نامعتبر/گم بودن، مقدار `undefined` می‌ماند و در `validation` به `false` ست می‌شود.
7. هیچ فیلد مترادف/Legacy (مثل `serverPublicKey`, `shortId`) در `UNMNode` ذخیره نمی‌شود — فقط نام استاندارد. ردیابی منشأ فقط در `metadata.originalMappings`.
8. **UNMNode غیرقابل تغییر (Immutable) است.** هیچ کد (نه Parser، نه Analyzer، نه UI) حق ندارد یک `UNMNode` موجود را Mutate کند؛ هر تغییر باید یک Instance جدید بسازد (Structural Sharing — مثل `{...node, validation: newValidation}`).

> 🔗 **رفع تنش Immutable-UNM در برابر Reactive-Preact (بازبینی نهایی):** این دو اصل در تضاد نیستند — فقط باید لایه‌ی واسط درست تعریف شود: `core/store/` (همان UI Adapter Layer که در سند `01-MASTER_BLUEPRINT` رسمی شد) یک Snapshot از مجموعه‌ی `UNMNode`ها نگه می‌دارد. وقتی تغییری رخ می‌دهد (مثلاً Analyzer کامل شد)، یک `UNMNode` **جدید** (نه Mutate شده) ساخته و در Store جای‌گذاری می‌شود؛ Preact از طریق Hooks به این Store **Subscribe** می‌کند و با تغییر Reference، Re-render طبیعی Preact فعال می‌شود. UNM همچنان تنها حقیقت سیستم می‌ماند؛ Preact فقط واکنش به تغییر Reference آن را نشان می‌دهد، نه این‌که خودش UNM را نگه دارد.

---

## 8. اصل معماری آینده — UNM Core vs Runtime Extensions *(ثبت‌شده، بدون اجرای فوری)*

> 💡 **پیشنهاد بازبینی (مهدی):** این اصل الان اجباری نیست، ولی به‌عنوان یک تصمیم معماری آینده ثبت می‌شود تا فراموش نشود (مطابق Rule 07 سند ANTI_CHAOS).

ایده: تفکیک رسمی بین:

- **UNM Core** — فقط داده‌ی اصلی نود (Identity, Protocol, Network, Security, Metadata)
- **UNM Runtime Extensions** — لایه‌های افزوده‌ی بعدی (`analysis`, `validation`, `conversion`) که توسط ماژول‌های دیگر (Analyzer/Validator/Converter) پر می‌شوند

**چرا این تفکیک ارزش دارد:** وقتی Plugin System (فاز ۱۱ سند 09) پیاده‌سازی شود، پلاگین‌ها باید بتوانند Extension جدید (مثل `geoip`, `latency`) به نود اضافه کنند **بدون دست زدن به Core**. اگر از همین الان مرز Core/Extension روشن باشد، آن فاز ساده‌تر خواهد بود.

**وضعیت فعلی:** در همین نسخه‌ی سند، `analysis`/`conversion` به‌صورت اختیاری (`?`) و `validation` اجباری تعریف شده‌اند — که عملاً همان روح این تفکیک را دارد، فقط هنوز به‌صورت یک Interface رسمی جدا (`UNMCoreNode` در برابر `UNMExtensions`) نوشته نشده. این کار در یک بازنگری بعدی (نه الان) انجام می‌شود.

---

## 9. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) افزودن Priority Chain برای مترادف‌های متعدد؛ افزودن Rule 8 (UNM Immutability)؛ رفع تنش Immutable-UNM/Reactive-Preact با ارجاع به `core/store/` (سند 01) |
| ⚠️ استثنای Freeze | این سند قبلاً «Freeze پیشنهادی» اعلام شده بود (v1.3)؛ این ویرایش طبق Rule 13 سند ANTI_CHAOS (نیاز به تأیید معماری برای تغییر مناطق Freeze‌شده) انجام شد — همین فرآیند بازبینی نهایی، آن تأیید است. بعد از این ویرایش، Freeze دوباره برقرار می‌شود. |
| سند بعدی | `06-BLUEPRINT_ANALYZER_ENGINE` |
