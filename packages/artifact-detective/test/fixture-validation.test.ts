import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYAML } from "yaml";
import { detectArtifactType } from "../src/detectors/type-detector.js";
import * as validators from "../src/validators/index.js";
import { extractLinterOutput } from "../src/parsers/linters/extractors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Generated fixture validation", () => {
  const languages = ["javascript"]; // Expand to ['javascript', 'python'] later

  for (const lang of languages) {
    describe(`${lang} fixtures`, () => {
      const manifestPath = join(
        __dirname,
        `../fixtures/sample-projects/${lang}/manifest.yml`,
      );
      const manifest = parseYAML(readFileSync(manifestPath, "utf-8"));

      for (const artifact of manifest.artifacts) {
        const artifactPath = join(
          __dirname,
          `../fixtures/generated/${lang}/${artifact.file}`,
        );

        describe(artifact.file, () => {
          it("exists in generated/ directory", () => {
            expect(existsSync(artifactPath)).toBe(true);
          });

          // ALWAYS test validator (structural correctness)
          it("passes validator", () => {
            const content = readFileSync(artifactPath, "utf-8");
            const validator = (validators as any)[artifact.validator];
            expect(validator).toBeDefined();
            const result = validator(content);
            expect(result.valid).toBe(true);
            if (!result.valid) {
              console.error(`Validation error: ${result.error}`);
            }
          });

          // ONLY test auto-detection if supported
          if (artifact.supports_auto_detection) {
            it(`auto-detects as ${artifact.type}`, () => {
              const result = detectArtifactType(artifactPath);
              expect(result.detectedType).toBe(artifact.type);
              expect(result.originalFormat).toBe(artifact.format);
            });
          }

          // Test parsers if specified
          if (artifact.parsers?.includes("extractLinterOutput")) {
            it("extracts linter output", () => {
              const content = readFileSync(artifactPath, "utf-8");
              const output = extractLinterOutput(artifact.type, content);
              expect(output).toBeTruthy();
              expect(output!.length).toBeGreaterThan(0);
            });
          }
        });
      }
    });
  }
});
