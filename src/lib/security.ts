import { z } from "zod";

export const urlSchema = z
  .string()
  .url()
  .refine((val) => {
    try {
      const url = new URL(val);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only HTTP and HTTPS protocols are allowed");

export function isSafeHostname(hostname: string): boolean {
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "169.254.169.254",
    "[::1]",
  ];

  if (blockedHostnames.includes(hostname)) return false;

  if (
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  ) {
    return false;
  }

  return true;
}
