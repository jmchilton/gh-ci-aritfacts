import type { ValidationResult } from "./types.js";

export function validateESLintOutput(content: string): ValidationResult {
  // ESLint output patterns:
  // - Line:col format: "  12:5  error  'foo' is not defined"
  // - Or summary: "✖ 5 problems (5 errors, 0 warnings)"
  // - Or file paths with errors

  const hasErrorPattern = /\d+:\d+\s+(error|warning)/.test(content);
  const hasSummary = /\d+\s+problem/.test(content);
  const hasFilePath = /\w+\.(js|ts|jsx|tsx)/.test(content);

  if (hasErrorPattern || hasSummary || hasFilePath) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match ESLint output format",
  };
}

export function validateTSCOutput(content: string): ValidationResult {
  // TypeScript compiler output pattern:
  // src/file.ts(line,col): error TS1234: message

  const tscPattern = /\.tsx?\(\d+,\d+\):\s+error\s+TS\d+/.test(content);

  if (tscPattern) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match TypeScript compiler output format",
  };
}

export function validateFlake8Output(content: string): ValidationResult {
  // Flake8 output pattern:
  // path/to/file.py:line:col: CODE message
  // Example: ./src/main.py:1:1: F401 'os' imported but unused

  const flake8Pattern = /\.py:\d+:\d+:\s+[A-Z]\d+/.test(content);

  if (flake8Pattern) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match flake8 output format",
  };
}

