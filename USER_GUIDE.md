# UNCT User Guide

This is the same content shown in-app (Settings → **Open the User Guide**), kept here as a
standalone file so it travels with Release artifacts. English first, فارسی below.

---

## English

### What is UNCT?

UNCT (Universal Network Config Toolkit) turns proxy/VPN configs — VLESS, VMess, Trojan,
Shadowsocks, Hysteria2, TUIC, and WireGuard links or subscription files — into a single readable
model, then lets you inspect, convert, and export them. Built for anyone managing a handful of
configs or a few thousand: no account, no install, no server.

**100% offline, by design.** Every parse, analysis, and export happens entirely in your browser
tab. Nothing you paste or import is ever sent to a server — there isn't one. That's not a privacy
promise, it's the architecture: UNCT has no backend to send data to.

### First time here? Do this

1. **Paste a config** — Open **Converter**, paste a config link (or a whole subscription) into
   the box, and press **Parse**.
2. **Look it over** — Open **Analyzer** for a security/compatibility breakdown of one node, or
   **Subscription Center** to search, filter, and manage the whole list.
3. **Export what you need** — Open **Export Center** and pick a format — plain links, Clash,
   Sing-box, Xray, QR codes, and more.

### The 8 screens

#### Dashboard
An at-a-glance summary: how many nodes you have, their health/warnings, and your most recent
imports and exports. Open this first after importing a config, or any time you want the big
picture.

![Dashboard](assets/guide/en/dashboard.png)

#### Converter
Where configs come in. Paste text, upload a file, drag a file onto the page, or paste from the
clipboard — UNCT detects the format automatically and parses it. Every session starts here — this
is the only way nodes enter UNCT.

![Converter](assets/guide/en/converter.png)

#### Analyzer
A deep breakdown of a single node: protocol details, TLS/Reality settings, compatibility and risk
scores, Cloudflare/Clean-IP checks, and more. Use this when you need to judge whether one specific
node is trustworthy or correctly configured.

![Analyzer](assets/guide/en/analyzer.png)

#### Subscription Center
The full node list: search, filter, sort, group, deduplicate, tag, test latency/port availability,
and build new subscription links from templates. Use this to manage many nodes at once — cleaning
up, organizing, or combining lists.

![Subscription Center](assets/guide/en/subscription.png)

#### Extractor
Pulls out one specific field across every node at once — UUIDs, IPs, domains, Reality keys,
credentials, transport settings, and more. Use this when you need one kind of value (e.g. every
UUID) copied out in bulk, not the full config.

![Extractor](assets/guide/en/extractor.png)

#### Export Center
Turns your node list into a file or format you can use elsewhere: plain links, Clash YAML,
Sing-box or Xray JSON, CSV, QR codes, a PDF/HTML report, or a full portable backup. Use this once
you're happy with the list and ready to hand it to another app or device.

![Export Center](assets/guide/en/export.png)

#### Settings
Theme, language, and how strictly UNCT validates/repairs/deduplicates while parsing — plus a full
data wipe. Use this to adjust behavior, switch to فارسی, or clear everything and start fresh. This
guide lives here too.

![Settings](assets/guide/en/settings.png)

#### Developer Console
Raw logs: what each parser tried, what got recovered or rejected, timing, and which alternative
format guesses lost to the winning one. Use this when something looks wrong and you need to see
exactly what UNCT did, step by step.

![Developer Console](assets/guide/en/devconsole.png)

### Known limits — read before you rely on this

This section is deliberately honest about where UNCT stops.

- **Very large imports**: a real ~5000-6000-node import once crashed the tab, before Subscription
  Center's node list was rebuilt to only render what's on screen. That rebuild is
  regression-tested up to 3000 nodes without issue; it isn't a certified guarantee at 5000-6000,
  just a real fix for a real incident.
- **Supported inputs**: VLESS, VMess, Trojan, Shadowsocks, Hysteria2, TUIC, and WireGuard links or
  config files, plus Clash/Clash.Meta, Sing-box, and Xray configs and subscription files.
  **Supported exports**: plain links, Clash YAML, Sing-box JSON, Xray JSON, Normalized/Analysis
  JSON, CSV, PDF, Excel, Markdown, ZIP, QR codes, and an HTML report.
- **Visualization**: node-relationship and topology diagrams were deliberately cut, not merely
  deferred — UNCT doesn't hold the multi-node relationship data they'd need. Only the Subscription
  Visualizer shipped.

---

## فارسی

### UNCT چیست؟

UNCT (جعبه‌ابزار جهانی کانفیگ شبکه) کانفیگ‌های پراکسی/VPN — لینک‌های VLESS، VMess، Trojan،
Shadowsocks، Hysteria2، TUIC، WireGuard یا فایل‌های Subscription — را به یک مدل واحد و خوانا
تبدیل می‌کند، سپس امکان بررسی، تبدیل و خروجی‌گیری از آن‌ها را می‌دهد. برای هرکسی که چند کانفیگ یا
چند هزارتا را مدیریت می‌کند مناسب است: بدون حساب کاربری، بدون نصب، بدون سرور.

**۱۰۰٪ آفلاین، از پایه‌ی طراحی.** هر Parse، تحلیل و خروجی‌گیری کاملاً همین‌جا در همین تب مرورگر
انجام می‌شود. هیچ‌چیزی که Paste یا Import می‌کنید هرگز به هیچ سروری ارسال نمی‌شود — چون اصلاً
سروری وجود ندارد. این فقط یک وعده‌ی حریم‌خصوصی نیست، خود معماری برنامه است: UNCT هیچ Backend‌ای
برای ارسال داده به آن ندارد.

### اولین بار اینجایید؟ این کار را بکنید

۱. **یک کانفیگ Paste کنید** — صفحه‌ی «مبدل» را باز کنید، یک لینک کانفیگ (یا یک Subscription
   کامل) را در کادر Paste کنید و روی «Parse» بزنید.
۲. **مرورش کنید** — «تحلیل‌گر» را برای بررسی امنیتی/سازگاری یک نود، یا «مرکز اشتراک» را برای
   جست‌وجو، فیلتر و مدیریت کل فهرست باز کنید.
۳. **آنچه لازم دارید را خروجی بگیرید** — «مرکز خروجی» را باز کنید و یک فرمت انتخاب کنید — لینک‌های
   ساده، Clash، Sing-box، Xray، کد QR و بیشتر.

### ۸ صفحه

#### داشبورد
یک خلاصه‌ی کلی: چند نود دارید، وضعیت سلامت/هشدارهای آن‌ها، و آخرین Import/Export‌های شما. بعد از
هر Import، یا هر وقت خواستید تصویر کلی را ببینید، اول همین‌جا را باز کنید.

![داشبورد](assets/guide/fa/dashboard.png)

#### مبدل
جایی که کانفیگ‌ها وارد می‌شوند. متن Paste کنید، فایل Upload کنید، فایل را روی صفحه Drag کنید، یا
از Clipboard Paste کنید — UNCT فرمت را خودش تشخیص داده و Parse می‌کند. هر جلسه‌ی کاری همین‌جا
شروع می‌شود — تنها راه ورود نود به UNCT همین صفحه است.

![مبدل](assets/guide/fa/converter.png)

#### تحلیل‌گر
بررسی عمیق یک نود: جزئیات پروتکل، تنظیمات TLS/Reality، امتیاز سازگاری و ریسک، بررسی
Cloudflare/Clean-IP و بیشتر. وقتی می‌خواهید مطمئن شوید یک نود خاص قابل‌اعتماد یا درست
پیکربندی‌شده است، اینجا را باز کنید.

![تحلیل‌گر](assets/guide/fa/analyzer.png)

#### مرکز اشتراک
فهرست کامل نودها: جست‌وجو، فیلتر، مرتب‌سازی، گروه‌بندی، حذف تکراری، برچسب‌گذاری، تست
Latency/Port، و ساخت لینک Subscription جدید از روی Template. برای مدیریت هم‌زمان تعداد زیادی نود
— پاکسازی، سازمان‌دهی یا ترکیب فهرست‌ها، اینجا را باز کنید.

![مرکز اشتراک](assets/guide/fa/subscription.png)

#### استخراج‌کننده
یک نوع مقدار خاص را از همه‌ی نودها هم‌زمان استخراج می‌کند — UUID، IP، دامنه، کلیدهای Reality،
Credentials، تنظیمات Transport و بیشتر. وقتی فقط یک نوع مقدار (مثلاً همه‌ی UUIDها) را به‌صورت
گروهی نیاز دارید، نه کل کانفیگ، اینجا را باز کنید.

![استخراج‌کننده](assets/guide/fa/extractor.png)

#### مرکز خروجی
فهرست نودهای شما را به فایل یا فرمتی قابل‌استفاده در جای دیگر تبدیل می‌کند: لینک ساده، Clash
YAML، JSON مخصوص Sing-box یا Xray، CSV، کد QR، گزارش PDF/HTML، یا یک نسخه‌ی پشتیبان قابل‌حمل
کامل. وقتی از فهرست راضی هستید و می‌خواهید آن را به برنامه یا دستگاه دیگری بدهید، اینجا را باز
کنید.

![مرکز خروجی](assets/guide/fa/export.png)

#### تنظیمات
تم، زبان، و میزان سخت‌گیری UNCT در اعتبارسنجی/تعمیر خودکار/حذف تکراری هنگام Parse — به‌علاوه‌ی
پاک‌کردن کامل داده‌ها. برای تغییر رفتار برنامه، سوییچ به فارسی، یا پاک‌کردن همه‌چیز و شروع
دوباره، اینجا را باز کنید. همین راهنما هم همین‌جا زندگی می‌کند.

![تنظیمات](assets/guide/fa/settings.png)

#### کنسول توسعه‌دهنده
لاگ خام: هر Parser چه امتحان کرد، چه چیزی بازیابی یا رد شد، زمان‌بندی، و کدام حدس فرمت جایگزین
در برابر برنده باخت. وقتی چیزی درست به‌نظر نمی‌رسد و می‌خواهید دقیقاً ببینید UNCT قدم‌به‌قدم چه
کاری کرد، اینجا را باز کنید.

![کنسول توسعه‌دهنده](assets/guide/fa/devconsole.png)

### محدودیت‌های شناخته‌شده — پیش از تکیه‌کردن رویشان بخوانید

این بخش عمداً درباره‌ی جایی که UNCT متوقف می‌شود صادق است.

- **Import‌های بسیار بزرگ**: یک Import واقعی ~۵۰۰۰-۶۰۰۰ نودی زمانی تب را کرش داد، پیش از آنکه
  فهرست نود «مرکز اشتراک» بازسازی شود تا فقط چیزی که روی صفحه دیده می‌شود را رندر کند. آن
  بازسازی تا ۳۰۰۰ نود با تست Regression تأیید شده؛ این یک تضمین رسمی برای ۵۰۰۰-۶۰۰۰ نیست، فقط
  یک رفع واقعی برای یک حادثه‌ی واقعی است.
- **ورودی‌های پشتیبانی‌شده**: لینک‌ها یا فایل‌های کانفیگ VLESS، VMess، Trojan، Shadowsocks،
  Hysteria2، TUIC و WireGuard، به‌علاوه‌ی کانفیگ و فایل Subscription مخصوص Clash/Clash.Meta،
  Sing-box و Xray. **خروجی‌های پشتیبانی‌شده**: لینک ساده، Clash YAML، JSON مخصوص Sing-box، JSON
  مخصوص Xray، JSON نرمال‌شده/تحلیل، CSV، PDF، Excel، Markdown، ZIP، کد QR، و یک گزارش HTML.
- **Visualization**: نمودارهای رابطه‌ی بین نودها و Topology عمداً به‌طور کامل حذف شدند، نه صرفاً
  به‌تعویق افتاده — UNCT داده‌ی رابطه‌ی چندنودی لازم برای آن‌ها را ندارد. تنها Subscription
  Visualizer ساخته شد.
