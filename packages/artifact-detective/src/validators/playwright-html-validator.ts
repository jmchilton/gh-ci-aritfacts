import type { ValidationResult } from "./types.js";

export function validatePlaywrightHTML(content: string): ValidationResult {
  if (!content.includes("playwright") && !content.includes("Playwright")) {
    return {
      valid: false,
      error: "Missing Playwright markers in HTML content",
    };
  }

  return { valid: true };
}
