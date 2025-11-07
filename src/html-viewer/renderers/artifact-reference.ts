import type { CatalogEntry } from "../../types.js";

export function renderArtifactReference(catalog: CatalogEntry[]): string {
  // Collect unique artifact types with their descriptors
  const artifactTypes = new Map<
    string,
    {
      artifactType: string;
      fileExtension?: string;
      shortDescription: string;
      toolUrl?: string;
      formatUrl?: string;
      parsingGuide: string;
      normalizedFrom?: string;
    }
  >();

  for (const entry of catalog) {
    if (entry.artifact && !artifactTypes.has(entry.artifact.artifactType)) {
      artifactTypes.set(entry.artifact.artifactType, entry.artifact);
    }
  }

  if (artifactTypes.size === 0) {
    return "";
  }

  const sortedTypes = Array.from(artifactTypes.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return `
    <section id="artifact-reference" class="section">
      <h2>Artifact Type Reference</h2>
      <div class="artifact-type-grid">
        ${sortedTypes
          .map(
            ([type, artifact]) => `
          <div class="artifact-type-card">
            <h3>
              ${type}
              ${artifact.fileExtension ? `<span class="ext">.${artifact.fileExtension}</span>` : ""}
            </h3>
            <p class="description">${artifact.shortDescription}</p>
            ${artifact.normalizedFrom ? `
              <div class="meta-row">
                <strong>Normalized from:</strong>
                ${artifact.normalizedFrom} → ${type}
              </div>
            ` : ""}
            ${artifact.toolUrl ? `
              <div class="meta-row">
                <strong>Tool:</strong>
                <a href="${artifact.toolUrl}" target="_blank">${new URL(artifact.toolUrl).hostname}</a>
              </div>
            ` : ""}
            ${artifact.formatUrl ? `
              <div class="meta-row">
                <strong>Format:</strong>
                <a href="${artifact.formatUrl}" target="_blank">${new URL(artifact.formatUrl).hostname}</a>
              </div>
            ` : ""}
            <details class="parsing-guide">
              <summary>Parsing Guide</summary>
              <pre>${artifact.parsingGuide}</pre>
            </details>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}
