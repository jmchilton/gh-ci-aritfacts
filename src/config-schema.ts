import { z } from "zod";
import type { ArtifactType } from "./types.js";

// Known artifact types from artifact-detective (for validation)
// This list should be kept in sync with artifact-detective's ArtifactType union
const KNOWN_ARTIFACT_TYPES = [
  "playwright-json",
  "jest-json",
  "jest-html",
  "pytest-json",
  "pytest-html",
  "junit-xml",
  "checkstyle-xml",
  "checkstyle-sarif-json",
  "spotbugs-xml",
  "surefire-html",
  "eslint-json",
  "mypy-ndjson",
  "mypy-json",
  "eslint-txt",
  "tsc-txt",
  "ruff-txt",
  "mypy-txt",
  "flake8-txt",
  "cargo-test-txt",
  "clippy-ndjson",
  "clippy-json",
  "clippy-txt",
  "rustfmt-txt",
  "gofmt-txt",
  "go-test-ndjson",
] as const;

// Schema for regex pattern validation
const regexPatternSchema = z
  .string()
  .refine(
    (pattern) => {
      try {
        new RegExp(pattern);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid regex pattern" },
  );

// Schema for artifact type (validates against known types)
const artifactTypeSchema = z
  .string()
  .refine(
    (type): type is ArtifactType => {
      return KNOWN_ARTIFACT_TYPES.includes(type as any);
    },
    {
      message: `Must be one of: ${KNOWN_ARTIFACT_TYPES.join(", ")}`,
    },
  );

// SkipPattern schema
const skipPatternSchema = z.object({
  pattern: regexPatternSchema,
  reason: z.string().optional(),
});

// ExpectPattern schema
const expectPatternSchema = z.object({
  pattern: regexPatternSchema,
  required: z.boolean().optional(),
  reason: z.string().optional(),
});

// ArtifactTypeMapping schema
const artifactTypeMappingSchema = z.object({
  pattern: regexPatternSchema,
  type: artifactTypeSchema,
  reason: z.string().optional(),
});

// ArtifactExtractionConfig schema
const artifactExtractionConfigSchema = z.object({
  type: artifactTypeSchema,
  toJson: z.boolean().optional(),
  extractorConfig: z
    .object({
      startMarker: z.string().optional(),
      endMarker: z.string().optional(),
      includeEndMarker: z.boolean().optional(),
    })
    .optional(),
  required: z.boolean().optional(),
  matchJobName: z.string().optional(),
  reason: z.string().optional(),
});

// WorkflowConfig schema
const workflowConfigSchema = z.object({
  workflow: z.string(),
  skipArtifacts: z.array(skipPatternSchema).optional(),
  expectArtifacts: z.array(expectPatternSchema).optional(),
  customArtifactTypes: z.array(artifactTypeMappingSchema).optional(),
  extractArtifactTypesFromLogs: z.array(artifactExtractionConfigSchema).optional(),
  skip: z.boolean().optional(),
  description: z.string().optional(),
});

// Main Config schema
export const configSchema = z.object({
  outputDir: z.string().optional(),
  defaultRepo: z.string().optional(),
  maxRetries: z.number().int().positive().optional(),
  retryDelay: z.number().int().positive().optional(),
  pollInterval: z.number().int().positive().optional(),
  maxWaitTime: z.number().int().positive().optional(),
  skipArtifacts: z.array(skipPatternSchema).optional(),
  customArtifactTypes: z.array(artifactTypeMappingSchema).optional(),
  extractArtifactTypesFromLogs: z.array(artifactExtractionConfigSchema).optional(),
  workflows: z.array(workflowConfigSchema).optional(),
});

export type ConfigSchema = z.infer<typeof configSchema>;

