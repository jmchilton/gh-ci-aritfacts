# Richer Metadata from artifact-detective

## Overview

Incorporate artifact-detective v1.15.0's validation information and ArtifactDescriptor metadata into logs and HTML output.

## Background

artifact-detective v1.15.0 introduced:
- `detectArtifactType()` now accepts `{ validate?: boolean }` option
- Returns enhanced `DetectionResult` with `artifact?: ArtifactDescriptor` and `validationResult?: ValidationResult`
- `extract()` returns `ExtractResult` with `artifact: ArtifactDescriptor` and `validationResult?: ValidationResult`

## New Types from artifact-detective

### DetectionResult
```typescript
interface DetectionResult {
  detectedType: ArtifactType;
  originalFormat: OriginalFormat;
  isBinary: boolean;
  artifact?: ArtifactDescriptor;        // Auto-included for non-binary types
  validationResult?: ValidationResult;  // When validate: true
}
```

### ExtractResult
```typescript
interface ExtractResult {
  content: string;
  artifact: ArtifactDescriptor;
  validationResult?: ValidationResult;  // Validation of extracted content
}
```

### ArtifactDescriptor
```typescript
interface ArtifactDescriptor {
  artifactType: ArtifactType;
  fileExtension?: string;
  shortDescription: string;
  toolUrl?: string;
  formatUrl?: string;
  parsingGuide: string;
  isJSON: boolean;
  normalizedFrom?: ArtifactType;  // Set when artifact is normalized (e.g., pytest-html → pytest-json)
}
```

### ValidationResult (from artifact-detective)
```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  artifact?: ArtifactDescriptor;
}
```

## Implementation Steps

### 1. Update types.ts

Import new types from artifact-detective:
```typescript
export type {
  ArtifactDescriptor,
  ValidationResult as ArtifactValidationResult,  // Rename to avoid collision with workflow ValidationResult
} from "artifact-detective";
```

Extend `CatalogEntry`:
```typescript
export interface CatalogEntry {
  // ... existing fields ...
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}
```

Extend `LinterOutput`:
```typescript
export interface LinterOutput {
  detectedType: string;
  filePath: string;
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}
```

Add to `RunArtifact`:
```typescript
export interface RunArtifact {
  // ... existing fields ...
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}
```

Update `Summary.stats`:
```typescript
stats: {
  totalRuns: number;
  artifactsDownloaded: number;
  artifactsFailed: number;
  logsExtracted: number;
  htmlConverted: number;
  artifactsValidated: number;        // NEW
  artifactsInvalid: number;          // NEW
  linterOutputsExtracted: number;    // NEW
}
```

### 2. Update cataloger.ts

Enable validation in detection:
```typescript
const detection = detectArtifactType(filePath, { validate: true });
```

Store artifact descriptor and validation in catalog:
```typescript
catalog.push({
  artifactName,
  artifactId,
  runId,
  detectedType: detection.detectedType,
  originalFormat: detection.originalFormat,
  filePath,
  artifact: detection.artifact,
  validation: detection.validationResult,
});
```

Add debug logging after detection:
```typescript
if (detection.artifact) {
  logger.debug(`  ${basename(filePath)}: ${detection.artifact.shortDescription}`);
  if (detection.artifact.toolUrl) {
    logger.debug(`    Tool: ${detection.artifact.toolUrl}`);
  }
}

if (detection.validationResult) {
  if (detection.validationResult.valid) {
    logger.debug(`    Validation: ✓ valid`);
  } else {
    logger.warn(`    Validation: ✗ INVALID - ${detection.validationResult.error}`);
  }
}
```

For converted artifacts, ensure descriptor is captured from conversion result.

### 3. Update linter-collector.ts

Capture validation and artifact from extract result:
```typescript
const result = extract(config.type, logContent, {
  config: extractorConfig,
  normalize: config.toJson,
});

if (result) {
  const { content: artifactOutput, artifact, validationResult } = result;

  // ... save file ...

  runArtifactOutputs.push({
    detectedType: `${config.type}-${ext}`,
    filePath,
    artifact,
    validation: validationResult,
  });

  // Update job log
  log.linterOutputs = log.linterOutputs || [];
  log.linterOutputs.push({
    detectedType: `${config.type}-${ext}`,
    filePath,
    artifact,
    validation: validationResult,
  });
}
```

Add debug logging:
```typescript
logger.debug(`  Detected ${config.type} in job: ${log.jobName}`);
if (artifact) {
  logger.debug(`    ${artifact.shortDescription} (${artifact.fileExtension || 'txt'})`);
  if (artifact.toolUrl) {
    logger.debug(`    Tool: ${artifact.toolUrl}`);
  }
}
if (validationResult) {
  if (validationResult.valid) {
    logger.debug(`    Validation: ✓ valid`);
  } else {
    logger.warn(`    Validation: ✗ INVALID - ${validationResult.error}`);
  }
}
```

### 4. Update summary-generator.ts

Pass artifact and validation to RunArtifact:
```typescript
const catalogEntry = catalog.find(
  (c) => c.runId === runId && c.artifactId === item.artifactId,
);

return {
  name: item.artifactName,
  sizeBytes: item.sizeBytes,
  downloadStatus: item.status,
  errorMessage: item.errorMessage,
  detectedType: catalogEntry?.detectedType,
  filePath: catalogEntry?.filePath,
  converted: catalogEntry?.converted,
  artifact: catalogEntry?.artifact,
  validation: catalogEntry?.validation,
};
```

Calculate validation stats:
```typescript
const stats = {
  totalRuns: runStates.size,
  artifactsDownloaded: inventory.filter((a) => a.status === "success").length,
  artifactsFailed: inventory.filter((a) => a.status === "failed").length,
  logsExtracted: Array.from(logs.values()).reduce(
    (total, runLogs) =>
      total +
      runLogs.filter((log) => log.extractionStatus === "success").length,
    0,
  ),
  htmlConverted: catalog.filter((c) => c.converted).length,
  artifactsValidated: catalog.filter((c) => c.validation !== undefined).length,
  artifactsInvalid: catalog.filter((c) => c.validation && !c.validation.valid).length,
  linterOutputsExtracted: Array.from(logs.values()).reduce(
    (total, runLogs) =>
      total +
      runLogs.reduce(
        (sum, log) => sum + (log.linterOutputs?.length || 0),
        0,
      ),
    0,
  ),
};
```

### 5. Update HTML viewer

#### 5.1 Add validation stats card

In `src/html-viewer/renderers/summary.ts`, add validation stats to `renderStatsCards()`:

```typescript
{
  label: "Validated",
  value: summary.stats.artifactsValidated,
  type: "validated",
},
{
  label: "Invalid",
  value: summary.stats.artifactsInvalid,
  type: "invalid",
  warn: summary.stats.artifactsInvalid > 0,
},
{
  label: "Linter Outputs",
  value: summary.stats.linterOutputsExtracted,
  type: "linter",
},
```

#### 5.2 Enhance type badges with validation and tooltips

In artifact/catalog rendering code, update type badges:

```typescript
function renderTypeBadge(artifact: RunArtifact | CatalogEntry): string {
  const type = artifact.detectedType || 'unknown';
  const desc = artifact.artifact?.shortDescription || '';
  const valid = artifact.validation?.valid;
  const validIcon = valid === true ? '✓' : valid === false ? '✗' : '';

  return `
    <span class="type-badge" title="${desc}">
      ${type}
      ${validIcon ? `<span class="validation-icon ${valid ? 'valid' : 'invalid'}">${validIcon}</span>` : ''}
    </span>
  `;
}
```

#### 5.3 Add artifact metadata details section

For each artifact in the catalog/run artifacts table, add expandable section:

```typescript
function renderArtifactDetails(artifact: ArtifactDescriptor | undefined): string {
  if (!artifact) return '';

  return `
    <div class="artifact-details">
      <div class="detail-row">
        <strong>Type:</strong> ${artifact.artifactType}
        ${artifact.fileExtension ? `(.${artifact.fileExtension})` : ''}
      </div>
      <div class="detail-row">
        <strong>Description:</strong> ${artifact.shortDescription}
      </div>
      ${artifact.normalizedFrom ? `
        <div class="detail-row">
          <strong>Normalized from:</strong> ${artifact.normalizedFrom} → ${artifact.artifactType}
        </div>
      ` : ''}
      ${artifact.toolUrl ? `
        <div class="detail-row">
          <strong>Tool:</strong> <a href="${artifact.toolUrl}" target="_blank">${artifact.toolUrl}</a>
        </div>
      ` : ''}
      ${artifact.formatUrl ? `
        <div class="detail-row">
          <strong>Format:</strong> <a href="${artifact.formatUrl}" target="_blank">${artifact.formatUrl}</a>
        </div>
      ` : ''}
      <details class="parsing-guide">
        <summary>Parsing Guide</summary>
        <pre>${artifact.parsingGuide}</pre>
      </details>
    </div>
  `;
}
```

#### 5.4 Add artifact reference section

Create new file `src/html-viewer/renderers/artifact-reference.ts`:

```typescript
import type { CatalogEntry } from "../../types.js";

export function renderArtifactReference(catalog: CatalogEntry[]): string {
  // Collect unique artifact types with their descriptors
  const artifactTypes = new Map<string, any>();

  for (const entry of catalog) {
    if (entry.artifact && !artifactTypes.has(entry.artifact.artifactType)) {
      artifactTypes.set(entry.artifact.artifactType, entry.artifact);
    }
  }

  if (artifactTypes.size === 0) {
    return '';
  }

  const sortedTypes = Array.from(artifactTypes.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return `
    <section id="artifact-reference" class="section">
      <h2>Artifact Type Reference</h2>
      <div class="artifact-type-grid">
        ${sortedTypes.map(([type, artifact]) => `
          <div class="artifact-type-card">
            <h3>
              ${type}
              ${artifact.fileExtension ? `<span class="ext">.${artifact.fileExtension}</span>` : ''}
            </h3>
            <p class="description">${artifact.shortDescription}</p>
            ${artifact.toolUrl ? `
              <div class="meta-row">
                <strong>Tool:</strong>
                <a href="${artifact.toolUrl}" target="_blank">${new URL(artifact.toolUrl).hostname}</a>
              </div>
            ` : ''}
            ${artifact.formatUrl ? `
              <div class="meta-row">
                <strong>Format:</strong>
                <a href="${artifact.formatUrl}" target="_blank">${new URL(artifact.formatUrl).hostname}</a>
              </div>
            ` : ''}
            <details class="parsing-guide">
              <summary>Parsing Guide</summary>
              <pre>${artifact.parsingGuide}</pre>
            </details>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}
```

Add to main HTML viewer in `src/html-viewer/index.ts`:
```typescript
import { renderArtifactReference } from "./renderers/artifact-reference.js";

// ... in generateHtmlViewer function ...
const artifactReferenceHtml = renderArtifactReference(catalog);

// Add before closing </main> tag
```

#### 5.5 Add CSS styles

Add to `src/html-viewer/styles.ts`:

```typescript
.validation-icon {
  margin-left: 4px;
  font-size: 0.9em;
}

.validation-icon.valid {
  color: #28a745;
}

.validation-icon.invalid {
  color: #dc3545;
}

.artifact-details {
  margin-top: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9em;
}

.artifact-details .detail-row {
  margin-bottom: 8px;
}

.artifact-details .parsing-guide {
  margin-top: 12px;
}

.artifact-details .parsing-guide pre {
  background: white;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85em;
}

#artifact-reference .artifact-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.artifact-type-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.artifact-type-card h3 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 1.1em;
}

.artifact-type-card h3 .ext {
  color: #6c757d;
  font-size: 0.9em;
  font-weight: normal;
}

.artifact-type-card .description {
  color: #6c757d;
  margin: 8px 0;
}

.artifact-type-card .meta-row {
  margin: 8px 0;
  font-size: 0.9em;
}

.artifact-type-card .parsing-guide {
  margin-top: 12px;
}

.artifact-type-card .parsing-guide summary {
  cursor: pointer;
  color: #007bff;
  font-weight: 500;
}

.artifact-type-card .parsing-guide pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85em;
  margin-top: 8px;
}
```

### 6. Update catalog table

In `src/html-viewer/renderers/catalog.ts`, add `fileExtension` column:

```typescript
columns: [
  { key: "artifactName", label: "Artifact Name" },
  { key: "detectedType", label: "Type" },
  { key: "fileExtension", label: "Extension" },  // NEW
  { key: "originalFormat", label: "Format" },
  { key: "filePath", label: "File Path" },
],
```

Render file extension from artifact descriptor:
```typescript
function renderFileExtension(entry: CatalogEntry): string {
  return entry.artifact?.fileExtension || '-';
}
```

### 7. Testing

**Build test:**
```bash
npm run build
```

**Type check:**
```bash
npm run lint
```

**Manual test:**
- Run CLI against a PR with artifacts
- Check `catalog.json` includes `artifact` and `validation` fields
- Check `summary.json` includes new stats
- Verify HTML viewer displays:
  - Validation stats cards
  - Validation icons on type badges
  - Artifact type reference section
  - Clickable tool/format URLs
  - Parsing guides in expandable sections

**Test fixtures needed:**
- Valid artifacts (existing test data should work)
- Invalid artifacts (malformed JSON/XML/HTML for negative testing)

### 8. Documentation updates

Update README.md to mention:
- Artifact validation during cataloging
- Rich metadata in output (tool URLs, parsing guides)
- Artifact type reference in HTML viewer

## Summary of Changes

**Data flow:**
1. `detectArtifactType(filePath, { validate: true })` → Returns `artifact` + `validationResult`
2. `extract(type, log, options)` → Returns `artifact` + `validationResult`
3. Store in catalog/linter outputs
4. Pass through summary generator
5. Display in HTML viewer with reference section

**Logging:**
- WARN for validation failures (not ERROR)
- Show descriptions, tool URLs, validation status

**HTML enhancements:**
- Validation stats card
- Type badges with validation icons and tooltips
- File extension column
- Clickable tool/format URLs
- Expandable parsing guides
- New "Artifact Type Reference" section

**Stats tracking:**
- `artifactsValidated`
- `artifactsInvalid`
- `linterOutputsExtracted`
