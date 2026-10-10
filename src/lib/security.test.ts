import { describe, it, expect } from "vitest";
import { isSafeHostname, urlSchema } from "./security";

describe("Security Validations", () => {
  it("should accept valid public HTTP/HTTPS URLs", () => {
    expect(urlSchema.safeParse("https://example.com").success).toBe(true);
    expect(urlSchema.safeParse("http://en.wikipedia.org").success).toBe(true);
  });

  it("should reject invalid protocols", () => {
    expect(urlSchema.safeParse("ftp://example.com").success).toBe(false);
    expect(urlSchema.safeParse("file:///etc/passwd").success).toBe(false);
  });

  it("should block localhost and internal IPs (SSRF Protection)", () => {
    expect(isSafeHostname("localhost")).toBe(false);
    expect(isSafeHostname("127.0.0.1")).toBe(false);
    expect(isSafeHostname("169.254.169.254")).toBe(false);
    expect(isSafeHostname("192.168.1.1")).toBe(false);
    expect(isSafeHostname("10.0.0.1")).toBe(false);
  });

  it("should allow safe external hostnames", () => {
    expect(isSafeHostname("google.com")).toBe(true);
    expect(isSafeHostname("github.com")).toBe(true);
  });
});
