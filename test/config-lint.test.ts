import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { configSchema } from "../src/config-schema.js";
import { findAndLoadConfigFile } from "../src/config.js";
import type { Config } from "../src/types.js";

describe("config-lint schema validation", () => {
  describe("valid configurations", () => {
    it("validates empty config", () => {
      const result = configSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("validates minimal valid config", () => {
      const config = {
        outputDir: "/custom/output",
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates config with all top-level fields", () => {
      const config: Config = {
        outputDir: "/custom/output",
        defaultRepo: "owner/repo",
        maxRetries: 5,
        retryDelay: 10,
        pollInterval: 1800,
        maxWaitTime: 21600,
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates config with skip patterns", () => {
      const config: Config = {
        skipArtifacts: [
          { pattern: ".*-screenshots$", reason: "Skip screenshots" },
          { pattern: ".*-videos$" },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates config with custom artifact types", () => {
      const config: Config = {
        customArtifactTypes: [
          {
            pattern: "custom-.*\\.json$",
            type: "jest-json",
            reason: "Custom test format",
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates config with workflow configurations", () => {
      const config: Config = {
        workflows: [
          {
            workflow: "ci",
            skipArtifacts: [{ pattern: ".*-traces$" }],
            expectArtifacts: [
              { pattern: "test-results", required: true },
              { pattern: "coverage", required: false },
            ],
            customArtifactTypes: [
              {
                pattern: "custom-.*\\.html$",
                type: "jest-html",
              },
            ],
            skip: false,
            description: "CI workflow config",
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates config with artifact extraction config", () => {
      const config: Config = {
        extractArtifactTypesFromLogs: [
          {
            type: "jest-json",
            required: true,
            reason: "Extract test results from logs",
          },
          {
            type: "eslint-json",
            required: false,
            matchJobName: "lint",
            extractorConfig: {
              startMarker: "START_ESLINT",
              endMarker: "END_ESLINT",
              includeEndMarker: true,
            },
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("validates complex config with all features", () => {
      const config: Config = {
        outputDir: "/output",
        maxRetries: 3,
        skipArtifacts: [{ pattern: ".*-screenshots$" }],
        customArtifactTypes: [
          { pattern: "custom-.*", type: "jest-json" },
        ],
        extractArtifactTypesFromLogs: [
          { type: "jest-json", required: true },
        ],
        workflows: [
          {
            workflow: "ci",
            skipArtifacts: [{ pattern: ".*-traces$" }],
            expectArtifacts: [{ pattern: "test-results", required: true }],
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid configurations", () => {
    it("rejects invalid regex pattern in skipArtifacts", () => {
      const config = {
        skipArtifacts: [{ pattern: "[invalid(regex" }],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid regex pattern");
      }
    });

    it("rejects invalid artifact type", () => {
      const config = {
        customArtifactTypes: [
          {
            pattern: ".*\\.json$",
            type: "invalid-type",
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Must be one of");
      }
    });

    it("rejects negative maxRetries", () => {
      const config = {
        maxRetries: -1,
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/positive|>0/);
      }
    });

    it("rejects zero maxRetries", () => {
      const config = {
        maxRetries: 0,
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/positive|>0/);
      }
    });

    it("rejects non-integer maxRetries", () => {
      const config = {
        maxRetries: 3.5,
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/int|integer/);
      }
    });

    it("rejects invalid workflow config - missing workflow name", () => {
      const config = {
        workflows: [{}],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("workflow");
      }
    });

    it("rejects invalid workflow config - invalid regex in skipArtifacts", () => {
      const config = {
        workflows: [
          {
            workflow: "ci",
            skipArtifacts: [{ pattern: "[invalid" }],
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid regex pattern");
      }
    });

    it("rejects invalid artifact extraction config - invalid type", () => {
      const config = {
        extractArtifactTypesFromLogs: [
          {
            type: "invalid-type",
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Must be one of");
      }
    });

    it("rejects invalid expectArtifacts - invalid regex", () => {
      const config = {
        workflows: [
          {
            workflow: "ci",
            expectArtifacts: [{ pattern: "[invalid" }],
          },
        ],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid regex pattern");
      }
    });

    it("rejects wrong type for string fields", () => {
      const config = {
        outputDir: 123,
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("string");
      }
    });

    it("rejects wrong type for number fields", () => {
      const config = {
        maxRetries: "not-a-number",
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("number");
      }
    });

    it("rejects array with wrong item types", () => {
      const config = {
        skipArtifacts: ["not-an-object"],
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("object");
      }
    });
  });
});

describe("findAndLoadConfigFile", () => {
  const testDir = join(process.cwd(), "test-tmp-config-lint");
  const configPathJson = join(testDir, ".gh-ci-artifacts.json");
  const configPathYml = join(testDir, ".gh-ci-artifacts.yml");
  const configPathYaml = join(testDir, ".gh-ci-artifacts.yaml");

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("finding config files", () => {
    it("throws when no config file exists", () => {
      expect(() => findAndLoadConfigFile(undefined, testDir)).toThrow(
        "No config file found",
      );
    });

    it("finds and loads JSON config file", () => {
      const config = { outputDir: "/custom/output" };
      writeFileSync(configPathJson, JSON.stringify(config));

      const result = findAndLoadConfigFile(undefined, testDir);
      expect(result.path).toBe(configPathJson);
      expect(result.format).toBe("json");
      expect(result.content).toEqual(config);
    });

    it("finds and loads YAML config file", () => {
      const yamlContent = "outputDir: /custom/output\nmaxRetries: 5";
      writeFileSync(configPathYml, yamlContent);

      const result = findAndLoadConfigFile(undefined, testDir);
      expect(result.path).toBe(configPathYml);
      expect(result.format).toBe("yaml");
      expect((result.content as any).outputDir).toBe("/custom/output");
      expect((result.content as any).maxRetries).toBe(5);
    });

    it("prefers JSON over YAML when both exist", () => {
      const jsonConfig = { outputDir: "/json/output" };
      const yamlContent = "outputDir: /yaml/output";
      writeFileSync(configPathJson, JSON.stringify(jsonConfig));
      writeFileSync(configPathYml, yamlContent);

      const result = findAndLoadConfigFile(undefined, testDir);
      expect(result.path).toBe(configPathJson);
      expect(result.format).toBe("json");
    });

    it("uses explicit path when provided", () => {
      const customPath = join(testDir, "custom-config.json");
      const config = { outputDir: "/custom" };
      writeFileSync(customPath, JSON.stringify(config));

      const result = findAndLoadConfigFile(customPath, testDir);
      expect(result.path).toBe(customPath);
      expect(result.format).toBe("json");
      expect(result.content).toEqual(config);
    });

    it("throws when explicit path does not exist", () => {
      const customPath = join(testDir, "nonexistent.json");
      expect(() => findAndLoadConfigFile(customPath, testDir)).toThrow(
        "Config file not found",
      );
    });

    it("throws on invalid JSON", () => {
      writeFileSync(configPathJson, "{ invalid json }");
      expect(() => findAndLoadConfigFile(undefined, testDir)).toThrow(
        "Failed to parse",
      );
    });

    it("throws on invalid YAML", () => {
      writeFileSync(configPathYml, "invalid:\n\t\tyaml: [unclosed");
      expect(() => findAndLoadConfigFile(undefined, testDir)).toThrow(
        "Failed to parse",
      );
    });
  });

  describe("integration with schema validation", () => {
    it("validates valid config loaded from file", () => {
      const config: Config = {
        outputDir: "/output",
        maxRetries: 3,
        skipArtifacts: [{ pattern: ".*-screenshots$" }],
      };
      writeFileSync(configPathJson, JSON.stringify(config));

      const fileResult = findAndLoadConfigFile(undefined, testDir);
      const validationResult = configSchema.safeParse(fileResult.content);

      expect(validationResult.success).toBe(true);
    });

    it("rejects invalid config loaded from file", () => {
      const invalidConfig = {
        maxRetries: -1, // Invalid: must be positive
      };
      writeFileSync(configPathJson, JSON.stringify(invalidConfig));

      const fileResult = findAndLoadConfigFile(undefined, testDir);
      const validationResult = configSchema.safeParse(fileResult.content);

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.error.issues[0].message).toMatch(/positive|>0/);
      }
    });

    it("validates complex config with workflows", () => {
      const config: Config = {
        workflows: [
          {
            workflow: "ci",
            skipArtifacts: [{ pattern: ".*-traces$" }],
            expectArtifacts: [
              { pattern: "test-results", required: true },
            ],
            customArtifactTypes: [
              {
                pattern: "custom-.*\\.html$",
                type: "jest-html",
              },
            ],
          },
        ],
      };
      writeFileSync(configPathJson, JSON.stringify(config));

      const fileResult = findAndLoadConfigFile(undefined, testDir);
      const validationResult = configSchema.safeParse(fileResult.content);

      expect(validationResult.success).toBe(true);
    });

    it("rejects config with invalid artifact type in workflows", () => {
      const invalidConfig = {
        workflows: [
          {
            workflow: "ci",
            customArtifactTypes: [
              {
                pattern: ".*\\.json$",
                type: "invalid-type",
              },
            ],
          },
        ],
      };
      writeFileSync(configPathJson, JSON.stringify(invalidConfig));

      const fileResult = findAndLoadConfigFile(undefined, testDir);
      const validationResult = configSchema.safeParse(fileResult.content);

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.error.issues[0].message).toContain(
          "Must be one of",
        );
      }
    });
  });
});

