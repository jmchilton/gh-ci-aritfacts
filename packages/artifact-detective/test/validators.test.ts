import { describe, it, expect } from "vitest";
import {
  validateJestJSON,
  validatePlaywrightJSON,
  validatePlaywrightHTML,
  validatePytestJSON,
  validatePytestHTML,
  validateJUnitXML,
  validateESLintOutput,
  validateTSCOutput,
  validateFlake8Output,
  validateRuffOutput,
  validateMypyOutput,
  validate,
} from "../src/validators/index.js";

describe("Validator error paths", () => {
  describe("JSON validators", () => {
    it("jest rejects invalid JSON", () => {
      const result = validateJestJSON("not json");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("JSON");
    });

    it("jest rejects missing testResults", () => {
      const result = validateJestJSON('{"other": "data"}');
      expect(result.valid).toBe(false);
    });

    it("playwright rejects invalid JSON", () => {
      const result = validatePlaywrightJSON("not json");
      expect(result.valid).toBe(false);
    });

    it("playwright rejects missing suites", () => {
      const result = validatePlaywrightJSON('{"config": {}}');
      expect(result.valid).toBe(false);
    });

    it("pytest JSON rejects invalid JSON", () => {
      const result = validatePytestJSON("not json");
      expect(result.valid).toBe(false);
    });

    it("pytest JSON rejects missing tests array", () => {
      const result = validatePytestJSON('{"other": "data"}');
      expect(result.valid).toBe(false);
    });
  });

  describe("HTML validators", () => {
    it("playwright HTML rejects non-HTML", () => {
      const result = validatePlaywrightHTML("not html");
      expect(result.valid).toBe(false);
    });

    it("pytest HTML rejects non-HTML", () => {
      const result = validatePytestHTML("not html");
      expect(result.valid).toBe(false);
    });
  });

  describe("XML validators", () => {
    it("JUnit rejects non-XML", () => {
      const result = validateJUnitXML("not xml");
      expect(result.valid).toBe(false);
    });
  });

  describe("Linter validators", () => {
    it("ESLint rejects empty content", () => {
      const result = validateESLintOutput("");
      expect(result.valid).toBe(false);
    });

    it("ESLint rejects non-matching content", () => {
      const result = validateESLintOutput("random text");
      expect(result.valid).toBe(false);
    });

    it("TSC rejects non-matching content", () => {
      const result = validateTSCOutput("random text");
      expect(result.valid).toBe(false);
    });

    it("flake8 rejects non-matching content", () => {
      const result = validateFlake8Output("random text");
      expect(result.valid).toBe(false);
    });

    it("ruff rejects non-matching content", () => {
      const result = validateRuffOutput("random text");
      expect(result.valid).toBe(false);
    });

    it("mypy rejects non-matching content", () => {
      const result = validateMypyOutput("random text");
      expect(result.valid).toBe(false);
    });
  });

  describe("Central validate() function", () => {
    it("handles unknown artifact types", () => {
      const result = validate("unknown", "content");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No validator");
    });

    it("handles binary type (no validator)", () => {
      const result = validate("binary", "content");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No validator");
    });
  });
});
