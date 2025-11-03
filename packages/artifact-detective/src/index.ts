// Type detector
export { detectArtifactType } from "./detectors/type-detector.js";

// HTML parsers
export { extractPlaywrightJSON } from "./parsers/html/playwright-html.js";
export { extractPytestJSON } from "./parsers/html/pytest-html.js";

// Linter extractors
export {
  extractLinterOutput,
  detectLinterType,
  LINTER_PATTERNS,
} from "./parsers/linters/extractors.js";

// Types
export type {
  ArtifactType,
  OriginalFormat,
  DetectionResult,
  CatalogEntry,
  LinterOutput,
  LinterPattern,
  LinterMatch,
  PytestTest,
  PytestReport,
  PlaywrightTest,
  PlaywrightSuite,
  PlaywrightReport,
} from "./types.js";
