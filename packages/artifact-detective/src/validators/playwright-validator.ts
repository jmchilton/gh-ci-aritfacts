import type { ValidationResult } from "./types.js";

export function validatePlaywrightJSON(content: string): ValidationResult {
  try {
    const data = JSON.parse(content);

    // Playwright JSON must have config and suites
    if (!data.config) {
      return {
        valid: false,
        error: "Missing config object",
      };
    }

    if (!data.suites || !Array.isArray(data.suites)) {
      return {
        valid: false,
        error: "Missing or invalid suites array",
      };
    }

    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
