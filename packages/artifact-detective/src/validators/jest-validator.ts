import type { ValidationResult } from "./types.js";

export function validateJestJSON(content: string): ValidationResult {
  try {
    const data = JSON.parse(content);

    // Jest JSON must have testResults array
    if (!data.testResults || !Array.isArray(data.testResults)) {
      return {
        valid: false,
        error: "Missing or invalid testResults array",
      };
    }

    // Basic structure checks
    if (typeof data.numTotalTests !== "number") {
      return {
        valid: false,
        error: "Missing numTotalTests",
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
