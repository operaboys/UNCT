/**
 * core/i18n/normalize.js tests — digit/letter normalization per
 * 04-PARSER_ENGINE Stage 01 and ADR-019 Decision 3.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeDigitsToAscii,
  normalizeArabicLettersToPersian,
  normalizeText,
} from "../../core/i18n/normalize.js";

describe("normalizeDigitsToAscii", () => {
  it("converts Persian digits to ASCII", () => {
    expect(normalizeDigitsToAscii("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("converts Arabic-Indic digits to ASCII", () => {
    expect(normalizeDigitsToAscii("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("leaves ASCII digits and other characters untouched", () => {
    expect(normalizeDigitsToAscii("port 8443, count 3")).toBe("port 8443, count 3");
  });

  it("normalizes digits embedded inside a mixed Persian/technical string", () => {
    expect(normalizeDigitsToAscii("درگاه ۸۴۴۳ باز است")).toBe("درگاه 8443 باز است");
  });

  it("passes through non-string and empty input unchanged", () => {
    expect(normalizeDigitsToAscii("")).toBe("");
    expect(normalizeDigitsToAscii(null)).toBe(null);
    expect(normalizeDigitsToAscii(undefined)).toBe(undefined);
  });
});

describe("normalizeArabicLettersToPersian", () => {
  it("converts Arabic Yeh (ي) and Alef Maksura (ى) to Persian Yeh (ی)", () => {
    expect(normalizeArabicLettersToPersian("علي")).toBe("علی");
    expect(normalizeArabicLettersToPersian("علىي")).toBe("علیی");
  });

  it("converts Arabic Kaf (ك) to Persian Keheh (ک)", () => {
    expect(normalizeArabicLettersToPersian("كتاب")).toBe("کتاب");
  });

  it("leaves already-Persian letters and other characters untouched", () => {
    expect(normalizeArabicLettersToPersian("کتاب یک متن فارسی")).toBe("کتاب یک متن فارسی");
  });

  it("passes through non-string and empty input unchanged", () => {
    expect(normalizeArabicLettersToPersian("")).toBe("");
    expect(normalizeArabicLettersToPersian(null)).toBe(null);
    expect(normalizeArabicLettersToPersian(undefined)).toBe(undefined);
  });
});

describe("normalizeText", () => {
  it("applies both digit and letter normalization in one pass", () => {
    expect(normalizeText("سرور ١٢٣ با كاربر علي")).toBe("سرور 123 با کاربر علی");
  });

  it("is a no-op on plain ASCII input", () => {
    expect(normalizeText("vless://uuid@1.2.3.4:443?type=tcp")).toBe("vless://uuid@1.2.3.4:443?type=tcp");
  });
});
