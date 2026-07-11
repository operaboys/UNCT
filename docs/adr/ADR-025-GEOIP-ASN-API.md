# ADR-025 — GeoIP + ASN API: ipwho.is

**Status:** Accepted  
**Type:** Lightweight ADR (additive — new opt-in online feature under ADR-024)  
**Date:** 2026-06-30  
**Authors:** UNCT team  
**Scope:** Lightweight ADR — قابلیت جدید در `core/network/` که قوانین سه‌گانه‌ی ADR-024 را رعایت می‌کند

---

## تصمیم

از **ipwho.is** به‌عنوان API تامین‌کننده‌ی GeoIP + ASN استفاده می‌شود.

| خصوصیت | مقدار |
|---|---|
| Endpoint | `https://ipwho.is/{address}` |
| پروتکل | HTTPS (اجباری) |
| احراز هویت | ندارد — بدون API Key |
| Rate Limit | ~۱۰,۰۰۰ درخواست در ساعت (رایگان، بدون ثبت‌نام) |
| CORS | `Access-Control-Allow-Origin: *` (قابل فراخوانی مستقیم از مرورگر) |
| داده‌های برگشتی | `country`, `region`, `connection.asn`, `connection.isp`, `connection.org` |
| مدیریت IP خصوصی | `{ "success": false, "message": "IP address is not public." }` |
| Domain Name | قابل‌قبول در path — API آدرس را resolve می‌کند |

---

## گزینه‌های بررسی‌شده

| سرویس | HTTPS | بدون Key | Rate Limit | CORS | Country + ASN | دلیل رد |
|---|---|---|---|---|---|---|
| **ipwho.is** ✓ | ✓ | ✓ | ~۱۰k/hr | ✓ | ✓ | — (انتخاب‌شده) |
| ip-api.com | ✗ | ✓ | ۴۵/min | ✓ | ✓ | HTTPS در پلان رایگان موجود نیست — با mixed-content مرورگر ناسازگار |
| ipapi.co | ✓ | ✓ | ۱k/day | ✓ | جزئی (org only) | سهمیه‌ی روزانه خیلی پایین |
| freeipapi.com | ✓ | ✓ | ۶۰/min | ✓ | ✓ | Rate limit پایین‌تر از ipwho.is |
| ipinfo.io | ✓ | ✓ | ۵۰k/month | ✓ | ✓ | ASN در پلان رایگان محدود است |

---

## رعایت قوانین سه‌گانه‌ی ADR-024

| قانون | رعایت |
|---|---|
| **User-Initiated Only** | ✓ — فقط با کلیک دکمه‌ی «Lookup» |
| **Data Minimization — No Credentials** | ✓ — فقط `address` (از طریق `buildGeoTarget`) به API ارسال می‌شود |
| **Architectural Separation** | ✓ — کد در `core/network/geoip.js`، جدا از Pipeline اصلی |

---

## فرمت پاسخ API (نمونه)

```json
{
  "success": true,
  "ip": "8.8.8.8",
  "country": "United States",
  "region": "California",
  "city": "Mountain View",
  "connection": {
    "asn": 15169,
    "org": "Google LLC",
    "isp": "Google LLC",
    "domain": "google.com"
  }
}
```

برای IP خصوصی یا نامعتبر:
```json
{
  "success": false,
  "message": "IP address is not public.",
  "ip": "192.168.1.1"
}
```

---

## References

- ADR-024 (Optional Online Features — قوانین سه‌گانه)
- `core/network/geoip.js` (پیاده‌سازی)
- `tests/network/geoip.test.js` (تست‌های واحد با Mock)
