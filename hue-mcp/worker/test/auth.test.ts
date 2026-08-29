import { describe, expect, it } from "vitest";

function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

describe("tokensMatch (constant-time comparison)", () => {
  it("returns true for identical tokens", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
  });

  it("returns false for different tokens of same length", () => {
    expect(tokensMatch("abc123", "abc124")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(tokensMatch("short", "longer-token")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(tokensMatch("", "")).toBe(true);
  });

  it("returns false for empty vs non-empty", () => {
    expect(tokensMatch("", "x")).toBe(false);
  });
});
