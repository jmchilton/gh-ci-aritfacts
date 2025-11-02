import type { ValidationResult } from "./types.js";

export function validateJUnitXML(content: string): ValidationResult {
  if (!content.includes("<testsuites") && !content.includes("<testsuite")) {
    return {
      valid: false,
      error: "Missing <testsuites> or <testsuite> root element",
    };
  }

  if (!content.includes("<testcase")) {
    return {
      valid: false,
      error: "Missing <testcase> elements",
    };
  }

  return { valid: true };
}
