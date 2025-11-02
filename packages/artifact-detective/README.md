# artifact-detective

Detect and parse CI artifact types for test frameworks and linters.

## Overview

`artifact-detective` is a library for identifying and parsing CI artifacts from various test frameworks, linters, and type checkers. It reads HTML, JSON, XML, and text outputs, detects the tool that generated them, and extracts structured data for analysis.

## Features

- **Automatic type detection** by content inspection
- **HTML to JSON conversion** for pytest-html and Playwright HTML reports
- **Linter output extraction** from CI logs
- **Zero dependencies** (except cheerio for HTML parsing)
- **TypeScript** with full type definitions

## Installation

```bash
npm install artifact-detective
```

## Usage

### Detect Artifact Type

```typescript
import { detectArtifactType } from 'artifact-detective';

const result = detectArtifactType('./test-results/report.html');
console.log(result);
// {
//   detectedType: 'pytest-html',
//   originalFormat: 'html',
//   isBinary: false
// }
```

### Parse HTML Reports

```typescript
import { extractPytestJSON, extractPlaywrightJSON } from 'artifact-detective';

// pytest-html → structured JSON
const pytestReport = extractPytestJSON('./pytest-report.html');
console.log(pytestReport.tests);

// Playwright HTML → structured JSON
const playwrightReport = extractPlaywrightJSON('./playwright-report.html');
```

### Extract Linter Output

```typescript
import { detectLinterType, extractLinterOutput } from 'artifact-detective';

const logContent = readFileSync('./ci-log.txt', 'utf-8');

const linterType = detectLinterType('lint', logContent);
// 'eslint' | 'ruff' | 'mypy' | ...

if (linterType) {
  const output = extractLinterOutput(linterType, logContent);
  console.log(output); // Extracted linter-specific output
}
```

## Supported Formats

### Test Frameworks
- **Playwright**: JSON, HTML
- **Jest**: JSON
- **pytest**: JSON, HTML (via pytest-html)
- **JUnit**: XML

### Linters
- **ESLint**: text output
- **Prettier**: text output
- **Ruff**: text output
- **flake8**: text output
- **pylint**: text output
- **isort**: text output
- **black**: text output

### Type Checkers
- **TypeScript (tsc)**: text output
- **mypy**: text output

## API

### `detectArtifactType(filePath: string): DetectionResult`

Detect artifact type by inspecting file content.

**Returns:**
```typescript
{
  detectedType: ArtifactType;
  originalFormat: OriginalFormat;
  isBinary: boolean;
}
```

### `extractPytestJSON(htmlFilePath: string): PytestReport | null`

Extract structured data from pytest-html report.

### `extractPlaywrightJSON(htmlFilePath: string): object | null`

Extract embedded JSON from Playwright HTML report.

### `detectLinterType(jobName: string, logContent: string): string | null`

Detect which linter produced the output.

### `extractLinterOutput(linterType: string, logContent: string): string | null`

Extract linter-specific output from CI logs.

## Types

All TypeScript types are exported:

```typescript
import type {
  ArtifactType,
  OriginalFormat,
  DetectionResult,
  CatalogEntry,
  LinterOutput,
  PytestTest,
  PytestReport,
} from 'artifact-detective';
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Type check
npm run lint
```

## Future Work

See [FIXTURE_PLAN.md](./FIXTURE_PLAN.md) for the planned fixture generation framework to create reproducible test artifacts from real tools.

## License

MIT
