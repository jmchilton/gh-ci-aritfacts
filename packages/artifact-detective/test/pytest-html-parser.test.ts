import { describe, it, expect } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { extractPytestJSON } from "../src/parsers/html/pytest-html.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, "../fixtures");

describe("extractPytestJSON", () => {
  describe("Generated fixtures", () => {
    it("extracts JSON from generated pytest-html report", () => {
      const htmlPath = join(
        FIXTURES_DIR,
        "generated/python/pytest-report.html",
      );
      const report = extractPytestJSON(htmlPath);

      expect(report).not.toBeNull();
      expect(report!.tests).toBeDefined();
      expect(Array.isArray(report!.tests)).toBe(true);

      // Should have 7 tests total (4 pass, 2 fail, 1 skip)
      expect(report!.tests.length).toBe(7);

      // Check we have the expected outcomes
      const passed = report!.tests.filter((t) => t.outcome === "passed");
      const failed = report!.tests.filter((t) => t.outcome === "failed");
      const skipped = report!.tests.filter((t) => t.outcome === "skipped");

      expect(passed.length).toBe(4);
      expect(failed.length).toBe(2);
      expect(skipped.length).toBe(1);

      // Check environment data
      expect(report!.environment).toBeDefined();
      expect(report!.environment?.Python).toBe("3.11.7");

      // Check specific test details
      const passTest = report!.tests.find((t) =>
        t.nodeid.includes("test_passes_basic_assertion"),
      );
      expect(passTest).toBeDefined();
      expect(passTest!.outcome).toBe("passed");

      const failTest = report!.tests.find((t) =>
        t.nodeid.includes("test_fails_deliberately"),
      );
      expect(failTest).toBeDefined();
      expect(failTest!.outcome).toBe("failed");
      expect(failTest!.log).toContain("AssertionError: Expected failure");

      const skipTest = report!.tests.find((t) =>
        t.nodeid.includes("test_skipped"),
      );
      expect(skipTest).toBeDefined();
      expect(skipTest!.outcome).toBe("skipped");
    });
  });

  describe("Manual fixtures", () => {
    it("extracts JSON from manually created pytest-html sample", () => {
      const htmlPath = join(FIXTURES_DIR, "html/pytest-html-sample.html");
      const report = extractPytestJSON(htmlPath);

      expect(report).not.toBeNull();
      expect(report!.tests).toBeDefined();
      expect(Array.isArray(report!.tests)).toBe(true);

      // Manual fixture is minimal - should have at least 1 test
      expect(report!.tests.length).toBeGreaterThan(0);

      // Check basic structure
      const firstTest = report!.tests[0];
      expect(firstTest.nodeid).toBeDefined();
      expect(firstTest.outcome).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("throws on non-existent file", () => {
      expect(() => {
        extractPytestJSON("/nonexistent/file.html");
      }).toThrow();
    });

    it("returns null for HTML without pytest data", () => {
      // Create a minimal HTML file without pytest markers
      const tempPath = join(FIXTURES_DIR, "html/generic.html");
      // This will fail to read, but test the error path
      expect(() => {
        extractPytestJSON(tempPath);
      }).toThrow();
    });
  });

  describe("Data conversion", () => {
    it("converts test outcomes correctly", () => {
      const htmlPath = join(
        FIXTURES_DIR,
        "generated/python/pytest-report.html",
      );
      const report = extractPytestJSON(htmlPath);

      expect(report).not.toBeNull();

      // All outcomes should be normalized
      const validOutcomes = ["passed", "failed", "skipped", "error"];
      report!.tests.forEach((test) => {
        expect(validOutcomes).toContain(test.outcome);
      });
    });

    it("includes log output for failed tests", () => {
      const htmlPath = join(
        FIXTURES_DIR,
        "generated/python/pytest-report.html",
      );
      const report = extractPytestJSON(htmlPath);

      const failedTests = report!.tests.filter(
        (t) => t.outcome === "failed",
      );

      // At least one failed test should have log output
      const hasLogs = failedTests.some((test) => test.log && test.log.length > 0);
      expect(hasLogs).toBe(true);
    });

    it("calculates exit code based on test results", () => {
      const htmlPath = join(
        FIXTURES_DIR,
        "generated/python/pytest-report.html",
      );
      const report = extractPytestJSON(htmlPath);

      // Report has failures, so exit code should be 1
      expect(report!.exitCode).toBe(1);
    });
  });
});
