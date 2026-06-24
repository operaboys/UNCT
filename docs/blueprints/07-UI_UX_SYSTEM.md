# BLUEPRINT 07 — UI/UX SYSTEM

**Universal Network Config Toolkit (UNCT)**

| | |
|---|---|
| **Status** | REVISED — هم‌راستا با تصمیم Preact، تفکیک Future Modules |
| **Priority** | CRITICAL |
| **وابسته به** | 14-DEPENDENCY_POLICY (استثنای Preact) |

> ⚠️ **تغییرات نسبت به نسخه‌ی اصلی:**
> 1. بخش «Future UI Modules» به Backlog منتقل شد.
> 2. یادآوری معماری: کامپوننت‌ها با **Preact** ساخته می‌شوند، نه Vanilla JS دستی — یعنی State/Re-render توسط فریم‌ورک مدیریت می‌شود، نه یک Render Engine سفارشی (جزئیات در سند 13).

---

## 1. Design Philosophy

Professional · Modern · Fast · Minimal · Information Dense · Mobile First · Desktop Optimized · Offline First

---

## 2. Visual Identity

**Style:** Cyber Professional, Glassmorphism, Neumorphism Elements, Terminal Inspired, Developer Friendly

### Color System

| نقش | رنگ |
|---|---|
| Primary Accent | Electric Blue |
| Secondary Accent | Purple |
| Success | Green |
| Warning | Amber |
| Error | Red |
| Neutral | Slate |

### Theme Engine
Dark Mode · Light Mode · Auto Mode · System Sync

---

## 3. Layout Architecture

```
App Shell → Sidebar → Workspace → Inspector → Console
```

---

## 4. Main Screens

Dashboard · Converter · Analyzer · Subscription Center · Extractor · Export Center · Settings · Developer Console

### 4.1 Dashboard
Quick Stats, Recent Imports, Recent Exports, Node Summary, Health Overview, Warnings

### 4.2 Converter Screen
```
Input Panel → Parser Preview → Normalized Object → Output Panel
```
- **Input Panel:** Paste Area, File Upload, Drag-Drop Zone, Clipboard Import
- **Parser Preview:** Detected Format, Confidence Score, Protocol Count, Errors, Warnings
- **Recovery Actions** *(جدید — پیشنهاد بازبینی)*: Recovered Fields Count, Repair Actions (مثل "Broken Base64 Fixed", "URL Encoding Repaired"), Recovery Warnings
  > این اطلاعات از قبل در `metadata.recoveryActions` (سند 05) و Stage 10/11 (سند 04) وجود دارد؛ این بخش فقط نمایش آن در UI است.
- **Output Panel:** Generated Links, JSON, YAML, QR

### 4.3 Analyzer Screen
Node Details, Protocol Analysis, Security Analysis, Compatibility Analysis, Cloudflare Analysis*, Reality Analysis

> *تحلیل Cloudflare طبق سند 06 در فاز نیمه‌قطعی است؛ این بخش از UI تا تکمیل آن ماژول به‌صورت Placeholder/Disabled نمایش داده می‌شود.

### 4.4 Subscription Center
Node List, Search, Filter, Group, Tag, Sort, Merge, Split, Deduplicate

> ⚠️ این صفحه باید تا ۱۰,۰۰۰+ نود را بدون لگ نشان دهد. به‌جای Render Engine دستی، از یک کتابخانه‌ی Virtual List سبک (مثل `preact-virtual-list` یا معادل) استفاده می‌شود (جزئیات در سند 13).

### 4.5 Extractor Screen
UUID, IP, Domain, Worker*, Reality, DNS Extractor

> *Worker Extractor به فاز نیمه‌قطعی Analyzer وابسته است.

### 4.6 Export Center
TXT, JSON, CSV, YAML, ZIP, QR, HTML Report

> 🔗 **افزوده‌شده (پیشنهاد بازبینی):** **Clipboard Export / Quick Copy Actions** — کپی سریع به Clipboard. شاید از نظر تخصصی «Export» محسوب نشود، اما در ابزارهای شبکه‌ای یکی از پرکاربردترین قابلیت‌هاست و باید کنار بقیه‌ی Export Profiles (سند 08) در دسترس باشد.

### 4.7 Developer Console
Parser Logs, Warnings, Errors, Recovery Logs, Validation Logs, Performance Logs

> 🔗 **افزوده‌شده (پیشنهاد بازبینی):** **Detection Logs / Detection Metadata Viewer** — نمایش Confidence Score و Alternative Candidates که در سند 04 (Stage 02 — Detection Metadata) تعریف شده‌اند. بدون این بخش، آن داده‌ی ارزشمند جایی برای نمایش ندارد.

---

## 5. Mobile UX Rules
Single Column · Bottom Navigation · Floating Actions · Large Touch Targets

> 🔗 **پیشنهاد بازبینی:** در موبایل، `Sidebar` (که در Layout Architecture بخش ۳ آمده) عملاً جایی برای نمایش ندارد. باید **Collapse شود به Bottom Navigation یا Drawer**.

## 6. Desktop UX Rules
Multi Panel Layout · Resizable Panels · Keyboard Shortcuts · Advanced Inspector

## 7. Accessibility
Keyboard Navigation · High Contrast · Screen Reader Friendly · Scalable Typography

---

## 8. Backlog — Future UI Modules

> ایده‌هایی برای آینده؛ بدون Spec و بدون Commitment زمانی (مطابق Rule 7 سند ANTI_CHAOS).

- Visual Graph Explorer
- Node Relationship Map
- Subscription Visualizer
- Cloudflare Topology View
- Reality Visualizer

---

## 8.1 تصمیم نهایی: بدون Event Bus جدا *(جدید — بازبینی نهایی؛ بستن Flag باز قبلی)*

**تصمیم:** پروژه از **Preact Context API + Hooks** به‌تنهایی استفاده می‌کند (مسیر A). هیچ کتابخانه‌ی Event Bus جدا (مثل `mitt` یا `eventemitter3`) در MVP اضافه نمی‌شود.

**چرا این تصمیم کم‌ریسک است:**
- جریان داده‌ی پروژه از ابتدا **Function-Call-Based** طراحی شده (`Parser → UNM → Analyzer → ...`، سند 02)، نه Event-Driven؛ یعنی هیچ Listener نامتزامنی منتظر «رویداد» نیست.
- تنها استثنای واقعی Async، ارتباط با Web Worker است که با `postMessage` خام (سند 10) مدیریت می‌شود، نه با یک Event Bus سفارشی.
- Selector Pattern (سند 11، ANTI_CHAOS) همان نیاز «اطلاع‌رسانی تغییر» را برای UI حل می‌کند، بدون اضافه‌کردن یک Dependency جدید (هم‌خوان با اصل Minimal Dependencies، سند 14).

**مسیر فرار (Escape Hatch):** اگر در Phase 6 (Analyzer Engine) رویدادهای Domain واقعاً پیچیده شدند (نه فرضی)، مهاجرت به یک Event Bus سبک با یک ADR جدید بررسی می‌شود — نه از همین الان.

---

## 9. Document Control

| Field | Value |
|---|---|
| نسخه | v1.3 |
| اصلاحات نسبت به v1.2 | (بازبینی نهایی) بستن Flag باز Event Bus — تصمیم نهایی: فقط Preact Context API، بدون کتابخانه‌ی جدا (بخش 8.1) |
| اصلاحات نسبت به v1.1 | (بر اساس بازبینی مهدی) افزودن Sidebar Collapse Rule، Recovery Actions در Converter، Clipboard Export، Detection Logs در Developer Console |
| سند بعدی | `08-BLUEPRINT_EXPORT_ENGINE` |
