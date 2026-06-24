# BLUEPRINT 12 — PARSER FACTORY

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | APPROVED — بدون تغییر منطقی، فقط بازآرایی |
| **Priority** | CRITICAL |
| **وابسته به** | 04-PARSER_ENGINE, 05-UNIVERSAL_NODE_MODEL |

---

## 1. Mission

> Parser Expansion Without Core Modification

---

## 2. BaseParser Contract

هر Parser باید این متدها را پیاده‌سازی کند:

```typescript
interface BaseParser {
  detect(input: string): number;        // برمی‌گرداند: Confidence Score (0-100)
  parse(input: string): RawExtraction;  // استخراج خام فیلدها — برای Parserهای فعلی همیشه Sync
  validateStructure(extraction: RawExtraction): ValidationObject;  // اصلاح‌شده — فقط اعتبار ساختار استخراج‌شده، نه System Validation Engine
  normalize(extraction: RawExtraction): UNMNode;  // خروجی نهایی طبق سند 05
  recover(input: string, error: ParseError): RawExtraction | null;

  // ===== رزرو شده برای Plugin Parsers آینده (جدید — بازبینی نهایی) =====
  isAsync?: boolean;                                  // پیش‌فرض false — Parserهای فعلی نباید آن را ست کنند
  parseAsync?(input: string): Promise<RawExtraction>; // فقط وقتی isAsync=true معتبر است
}
```

> ⚠️ **آماده‌سازی برای Plugin System (جدید — بازبینی نهایی، Phase 11 سند 09):** Parserهای فعلی (Xray, URL, Subscription, ...) همیشه Sync هستند و این دو فیلد را تعریف نمی‌کنند. اما یک Plugin Parser آینده ممکن است برای Parse کردن نیاز به یک عملیات async داشته باشد (مثلاً واکشی یک Schema از شبکه، یا یک عملیات Crypto سنگین). رزرو این دو فیلد *الان* (به‌صورت اختیاری، بدون پیاده‌سازی) از این جلوگیری می‌کند که در Phase 11 کل `ParserFactory` برای پشتیبانی از Async Parsing بازنویسی شود — `ParserFactory` در همان لحظه فقط کافی است چک کند آیا `isAsync` ست شده یا نه و بر اساس آن `parse` یا `parseAsync` را صدا بزند.

> ⚠️ **اصلاح نسبت به نسخه‌ی قبلی (بازبینی اولویت ۲):** متد `validate()` به `validateStructure()` تغییر نام یافت. دلیل: نام قبلی می‌توانست با **Validation Engine** مرکزی (سند 04، Stage 13 / سند 05، `ValidationObject`) اشتباه گرفته شود. این متد فقط اعتبار *ساختار استخراج‌شده‌ی همین Parser* را بررسی می‌کند (مثل «آیا فیلد address خالی نیست») — نه قوانین Cross-Field یا Semantic که وظیفه‌ی Validation Engine مرکزی است.

## 2.1 Optional Parser Hints *(جدید — پیشنهاد بازبینی)*

**Status:** OPTIONAL

Parser می‌تواند به‌صورت اختیاری این متدها را هم Expose کند:

```typescript
analyzeHint?(): Record<string, unknown>;
metadataHint?(): Record<string, unknown>;
formatVersion?(): string;
```

> این متدها برای Analyzer و Developer Console مفید هستند (مثلاً اشاره‌ای پیش از تحلیل کامل)، ولی **هرگز نباید روی نتیجه‌ی Parsing تأثیر بگذارند.**

### Hints Are Advisory Only *(جدید — پیشنهاد بازبینی)*

**قانون مطلق:** هیچ‌کدام از این Hintها مجاز نیستند روی موارد زیر تأثیر بگذارند:
- ❌ Parser Selection (انتخاب در ParserFactory)
- ❌ Validation (نتیجه‌ی Validation Engine)
- ❌ Normalization (تولید UNMNode نهایی)

> Hintها فقط برای نمایش/دیباگ هستند — هیچ مسیر تصمیم‌گیری معماری نباید به آن‌ها وابسته شود.

---

## 3. Parser Tree

```
BaseParser
├── XrayParser
├── SingBoxParser
├── ClashParser
├── URLParser
├── SubscriptionParser
├── WireGuardParser
└── FutureParser  (هر پروتکل جدید — بدون تغییر این فایل‌ها)
```

---

## 4. ParserFactory — جریان انتخاب

```
Input
  ↓
Format Detector
  ↓
Confidence Score (هر Parser کاندید، عدد خودش را برمی‌گرداند)
  ↓
Factory Selection (بالاترین Confidence)
  ↓
Parser Instance
```

**استراتژی انتخاب:** Highest Confidence Wins

---

## 5. Recovery Strategy (زنجیره‌ی Fallback)

```
Primary Parser Failed
  ↓
Secondary Parser (دومین Confidence بالا)
  ↓
Fallback Parser (Generic/Best-Effort)
```

---

## 6. Extension Rule

> افزودن پروتکل جدید **هرگز** نباید Parserهای موجود را تغییر دهد — فقط یک Parser جدید ثبت می‌شود.

## 6.1 Parser Registration *(جدید — پیشنهاد بازبینی)*

**Status:** REQUIRED

- تمام Parserها باید از طریق `ParserFactory` ثبت (Register) شوند.
- نمونه‌سازی مستقیم (Direct Instantiation) Parser ممنوع است.
- `ParserFactory` تنها نقطه‌ی ورود برای ساخت Parser است.

**مثال:**
```typescript
ParserFactory.register("clash", ClashParser);
```

> این قانون جلوی دور زدن Factory را می‌گیرد — مثلاً جلوی این کد اشتباه: `new ClashParser()` به‌جای `ParserFactory.create("clash")`.

---

## 7. SOLID Compliance — Status: MANDATORY

| اصل | الزام |
|---|---|
| Open/Closed Principle | الزامی |
| Parser جدید | باید `BaseParser` را Extend کند |
| Parser جدید | باید از طریق `ParserFactory` ثبت (Register) شود |

**ممنوع:** تغییر دادن Parserهای موجود برای پشتیبانی پروتکل جدید.

---

## 8. Goal

Parser Expansion بدون تغییر Core — آماده برای Plugin Parsers در آینده.

## 8.1 Plugin Isolation Rule *(جدید — پیشنهاد بازبینی)*

> پیش‌نیاز برای Phase 11 (Plugin System، سند 09).

Plugin Parserها **مجاز نیستند** این موارد را تغییر دهند:
- Core Parsers
- UNM Schema
- Validation Rules

Plugin فقط حق **افزودن قابلیت Parsing جدید** را دارد، نه تغییر رفتار موجود.

---

## 9. Document Control

| Field | Value |
|---|---|
| نسخه | v1.4 |
| اصلاحات نسبت به v1.3 | (بازبینی نهایی) رزرو `isAsync?`/`parseAsync?` در BaseParser Contract برای آماده‌سازی Plugin Parsers سنگین/شبکه‌ای (Phase 11) — بدون تغییر در Parserهای فعلی |
| سند بعدی | `13-BLUEPRINT_RENDER_ENGINE` |
