import { describe, it, expect } from "vitest";
import { join } from "path";
import { detectArtifactType } from "../src/detectors/type-detector.js";

const FIXTURES_DIR = join(__dirname, "fixtures");

describe("detectArtifactType", () => {
  describe("HTML detection", () => {
    it("detects pytest-html by content", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "html/pytest-html-sample.html"),
      );
      expect(result.detectedType).toBe("pytest-html");
      expect(result.originalFormat).toBe("html");
      expect(result.isBinary).toBe(false);
    });

    it("detects playwright-html by content", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "html/playwright-html-sample.html"),
      );
      expect(result.detectedType).toBe("playwright-html");
      expect(result.originalFormat).toBe("html");
      expect(result.isBinary).toBe(false);
    });
  });

  describe("JSON detection", () => {
    it("detects playwright JSON by structure", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "json/playwright-json-sample.json"),
      );
      expect(result.detectedType).toBe("playwright-json");
      expect(result.originalFormat).toBe("json");
      expect(result.isBinary).toBe(false);
    });

    it("detects jest JSON by structure", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "json/jest-json-sample.json"),
      );
      expect(result.detectedType).toBe("jest-json");
      expect(result.originalFormat).toBe("json");
      expect(result.isBinary).toBe(false);
    });

    it("detects pytest JSON by structure", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "json/pytest-json-sample.json"),
      );
      expect(result.detectedType).toBe("pytest-json");
      expect(result.originalFormat).toBe("json");
      expect(result.isBinary).toBe(false);
    });
  });

  describe("XML detection", () => {
    it("detects JUnit XML by content", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "xml/junit-sample.xml"),
      );
      expect(result.detectedType).toBe("junit-xml");
      expect(result.originalFormat).toBe("xml");
      expect(result.isBinary).toBe(false);
    });
  });

  describe("Text detection", () => {
    it("detects eslint output by pattern", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "txt/eslint-sample.txt"),
      );
      expect(result.detectedType).toBe("eslint-txt");
      expect(result.originalFormat).toBe("txt");
      expect(result.isBinary).toBe(false);
    });

    it("detects flake8 output by pattern", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "txt/flake8-sample.txt"),
      );
      expect(result.detectedType).toBe("flake8-txt");
      expect(result.originalFormat).toBe("txt");
      expect(result.isBinary).toBe(false);
    });
  });

  describe("Binary detection", () => {
    it("detects PNG as binary", () => {
      const result = detectArtifactType("/path/to/screenshot.png");
      expect(result.detectedType).toBe("binary");
      expect(result.originalFormat).toBe("binary");
      expect(result.isBinary).toBe(true);
    });

    it("detects video as binary", () => {
      const result = detectArtifactType("/path/to/recording.mp4");
      expect(result.detectedType).toBe("binary");
      expect(result.originalFormat).toBe("binary");
      expect(result.isBinary).toBe(true);
    });
  });
});
