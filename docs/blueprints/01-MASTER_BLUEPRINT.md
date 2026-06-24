# MASTER BLUEPRINT v1.2

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Project Codename** | UNCT |
| **Status** | LOCKED (Core Vision) |
| **Version History** | v1.0 → v1.1 (Dev Sequence Added) → v1.2 (Reformatted, No Scope Change) |

---

## 1. Vision

> ساخت حرفه‌ای‌ترین ابزار آفلاین تبدیل، تحلیل، استخراج، اعتبارسنجی و مدیریت کانفیگ‌های شبکه مبتنی بر Xray، Sing-box، Clash و سایر اکوسیستم‌های مرتبط.

پروژه باید کاملاً **Client-Side** باشد و فقط با HTML/CSS/JavaScript اجرا شود.
هیچ سرور، API یا Backend نباید برای عملکرد اصلی مورد نیاز باشد.

---

## 2. Core Principles

- Zero Backend
- Privacy First
- Offline First
- Mobile First
- Parser Driven Architecture
- Modular Design
- Extensible Protocol Engine
- Enterprise Grade Error Handling

---

## 3. Primary Goals

| # | Goal |
|---|---|
| 01 | تشخیص خودکار هر نوع ورودی |
| 02 | تبدیل بین فرمت‌ها |
| 03 | آنالیز عمیق کانفیگ‌ها |
| 04 | مدیریت Subscription |
| 05 | استخراج داده‌های مخفی |
| 06 | ساخت خروجی‌های استاندارد |

---

## 4. Supported Inputs

- Xray JSON
- Sing-box JSON
- Clash YAML / Clash Meta YAML
- Subscription Base64
- VLESS / VMESS / Trojan / Shadowsocks / Hysteria2 / TUIC URL
- WireGuard Config
- TXT Lists
- Clipboard Data
- Drag & Drop Files
- ZIP Bundles

## 5. Supported Outputs

- VLESS / VMESS / Trojan / Shadowsocks / Hysteria2 / TUIC / WireGuard
- JSON / TXT / CSV / YAML
- QR Code
- Printable Report

---

## 6. System Layers

| Layer | Name |
|---|---|
| 01 | Importer Engine |
| 02 | Format Detector |
| 03 | Parser Engine |
| 04 | Normalizer Engine |
| 05 | Converter Engine |
| 06 | Analyzer Engine |
| 07 | Exporter Engine |
| 08 | UI Engine |

---

## 7. Non-Goals

این پروژه **هرگز** قرار نیست به این موارد تبدیل شود:

- VPN Client
- Proxy Client
- Tunnel Software
- Traffic Forwarder
- Packet Sniffer
- Real-Time Connection Engine

---

## 8. Architectural Foundation

**Status: CORE LAW — غیرقابل تغییر بدون تأیید معماری**

### System Model
UNM (Universal Node Model) به‌عنوان **Central Intermediate Representation** سیستم عمل می‌کند.

### Architectural Pattern
Compiler-Inspired Architecture — مشابه **Abstract Syntax Tree (AST)** در کامپایلرها.

### Purpose
- Decouple All Major System Components
- Reduce Dependency Complexity
- Provide Single Source Of Truth
- Enable Independent Module Evolution

### Core Rule
> All System Modules Operate On UNM.

### Raw Source Access

| دسترسی | لایه |
|---|---|
| ✅ مجاز | Importer Layer, Parser Layer |
| ❌ ممنوع | Analyzer, Converter, Export Engine, UI |

### Architectural Law

```
Raw Input → Parser → UNM → All Other Modules
```

### Dependency Principle
- هر ماژول اصلی به UNM وابسته است.
- UNM به هیچ‌چیز وابسته نیست.

### System Goal
Maximum Decoupling · Maximum Maintainability · Maximum Extensibility

### UI Adapter Layer *(جدید — بازبینی نهایی)*

> ⚠️ **رفع ابهام:** UI (Preact) هرگز مستقیماً UNM را Mutate نمی‌کند و هرگز جای UNM به‌عنوان Single Source of Truth نمی‌نشیند. مسیر رسمی:
>
> `Parser → UNM → core/store/ (Adapter Layer) → Preact Hooks/Context → UI Components`
>
> `core/store/` (طبق سند `MASTER_FILE_STRUCTURE`) دقیقاً همین نقش «Adapter» را ایفا می‌کند — این یک لایه‌ی جدید نیست، فقط نام‌گذاری رسمی یک مسئولیتی است که از قبل در ساختار پروژه وجود داشت. UNM همچنان تنها حقیقت سیستم باقی می‌ماند (Rule 10، سند ANTI_CHAOS)؛ Preact State صرفاً یک Projection موقت برای نمایش است، نه منبع داده.

---

## 9. Official Development Sequence

**Status: LOCKED | Priority: CRITICAL**

> تعریف تنها ترتیب مجاز توسعه پروژه. هیچ ماژولی نباید خارج از این توالی توسعه داده شود مگر با تأیید معماری.

> ⚠️ **یادداشت بازنگری:** ترتیب دقیق فازها و موتورهای مرتبط با State/Render در سند `09-DEVELOPMENT_ROADMAP` به‌روزرسانی می‌شود (تصمیم استفاده از Preact باعث حذف برخی مراحل دستی شده است). توالی منطقی زیر همچنان به‌عنوان مرجع کلی معتبر است.

```
01. Universal Node Model (UNM)
02. Validation Engine
03. State / Reactivity Layer
04. Parser Factory
05. Xray Parser
06. URL Parser
07. Subscription Parser
08. Sing-box Parser
09. Clash Parser
10. WireGuard Parser
11. Worker Engine (Web Worker — پردازش سنگین)
12. Analyzer Engine
13. Converter Engine
14. Storage Engine
15. Render / UI Layer
16. Export Engine
17. Plugin System
18. Advanced Features
```

### Dependency Rules

| ماژول | وابسته به |
|---|---|
| UNM | — (بدون وابستگی) |
| Validation Engine | UNM |
| State Layer | UNM |
| Parser Factory | UNM, Validation Engine |
| All Parsers | Parser Factory, UNM, Validation Engine |
| Worker Engine | All Parsers |
| Analyzer Engine | UNM, Worker Engine |
| Converter Engine | UNM, Analyzer Engine |
| Storage Engine | UNM |
| UI Layer | State Layer |
| Export Engine | UNM, Analyzer Engine, Converter Engine |

### Architectural Law
- No UI Before Core
- No Export Before Conversion
- No Conversion Before Parsing
- No Parsing Before UNM
- **UNM Is The Foundation**

### Success Definition
**Core First · UI Last · Architecture Before Features · Stability Before Expansion**

---

## 10. Document Control

| Field | Value |
|---|---|
| نسخه | v1.3 |
| اصلاحات نسبت به v1.2 | (بازبینی نهایی) رسمی‌سازی نام «UI Adapter Layer» برای نقشی که `core/store/` ایفا می‌کند؛ تأکید صریح که Preact State هرگز جایگزین UNM نمی‌شود |
| اصلاحات نسبت به v1.1 | فقط بازآرایی و فرمت‌بندی؛ بدون تغییر در Vision یا Core Law |
| تغییرات معماری مرتبط | حذف ساخت دستی State/Render Engine به نفع Preact (جزئیات در سند Dependency Policy و Roadmap) |
| سند بعدی پیشنهادی | `05-UNIVERSAL_NODE_MODEL` (بازنویسی دقیق Schema) |
