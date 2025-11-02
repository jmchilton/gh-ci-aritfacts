import type { Summary, ValidationResult } from '../../types.js';
import {
  renderStatsCards,
  renderStatusBadge,
  renderExpandableSection,
  renderTable,
  formatBytes,
  escapeHtml,
  type TableColumn,
} from '../components.js';

export function renderSummaryJson(data: Summary): string {
  let html = '<div class="rich-view summary-view">';
  
  // Header
  html += `
    <div class="rich-header">
      <h2>Summary: ${escapeHtml(data.repo)} PR #${data.pr}</h2>
      <div class="metadata-row">
        ${renderStatusBadge(data.status, data.status.toUpperCase())}
        <span class="metadata-item">SHA: <code>${data.headSha.substring(0, 8)}</code></span>
        <span class="metadata-item">Analyzed: ${new Date(data.analyzedAt).toLocaleString()}</span>
      </div>
    </div>
  `;
  
  // Stats cards
  html += '<div class="stats-grid">';
  html += renderStatsCards([
    { label: 'Total Runs', value: data.stats.totalRuns },
    { label: '✓ Downloaded', value: data.stats.artifactsDownloaded, type: 'success' },
    { label: '✗ Failed', value: data.stats.artifactsFailed, type: data.stats.artifactsFailed > 0 ? 'failure' : '' },
    { label: '📄 Logs', value: data.stats.logsExtracted },
    { label: '🔄 Converted', value: data.stats.htmlConverted },
  ]);
  
  // Add in-progress runs if any
  if (data.inProgressRuns > 0) {
    html += `<div class="stat stat-incomplete">⏳ In Progress: ${data.inProgressRuns}</div>`;
  }
  html += '</div>';
  
  // Validation results
  if (data.validationResults && data.validationResults.length > 0) {
    html += renderValidationSection(data.validationResults);
  }
  
  // Runs table
  html += '<div class="section-divider"></div>';
  html += '<h3>Workflow Runs</h3>';
  html += renderRunsTable(data);
  
  html += '</div>';
  return html;
}

function renderValidationSection(results: ValidationResult[]): string {
  const totalRequired = results.reduce((sum, r) => sum + r.missingRequired.length, 0);
  const totalOptional = results.reduce((sum, r) => sum + r.missingOptional.length, 0);
  
  let content = '<div class="validation-summary">';
  
  if (totalRequired > 0) {
    content += `<div class="validation-error">✗ ${totalRequired} required artifact(s) missing</div>`;
  }
  if (totalOptional > 0) {
    content += `<div class="validation-warning">⚠ ${totalOptional} optional artifact(s) missing</div>`;
  }
  
  content += '<div class="validation-details">';
  
  results.forEach(result => {
    const violations = [...result.missingRequired, ...result.missingOptional];
    if (violations.length === 0) return;
    
    content += `
      <div class="validation-workflow">
        <strong>${escapeHtml(result.workflowName)}</strong> 
        <span class="text-muted">(Run ${result.runId})</span>
        <ul class="validation-list">
    `;
    
    result.missingRequired.forEach(v => {
      content += `<li class="validation-item-error">
        <code>${escapeHtml(v.pattern)}</code> (required)
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ''}
      </li>`;
    });
    
    result.missingOptional.forEach(v => {
      content += `<li class="validation-item-warning">
        <code>${escapeHtml(v.pattern)}</code> (optional)
        ${v.reason ? `<span class="text-muted">- ${escapeHtml(v.reason)}</span>` : ''}
      </li>`;
    });
    
    content += '</ul></div>';
  });
  
  content += '</div></div>';
  
  return renderExpandableSection('validation', 'Validation Results', content, true);
}

function renderRunsTable(data: Summary): string {
  const columns: TableColumn[] = [
    { key: 'expand', label: '', sortable: false, render: () => '<span class="row-toggle">▶</span>' },
    { key: 'runId', label: 'Run ID' },
    { key: 'conclusion', label: 'Status', render: (val) => renderStatusBadge(val) },
    { key: 'artifactCount', label: 'Artifacts' },
    { key: 'logCount', label: 'Logs' },
    { 
      key: 'hasValidation', 
      label: 'Validation', 
      render: (val, row) => {
        if (!row.validationResult) return '';
        const req = row.validationResult.missingRequired.length;
        const opt = row.validationResult.missingOptional.length;
        if (req > 0) return `<span class="validation-badge-error">${req} required</span>`;
        if (opt > 0) return `<span class="validation-badge-warning">${opt} optional</span>`;
        return '';
      }
    },
  ];
  
  const rows = data.runs.map(run => ({
    runId: run.runId,
    conclusion: run.conclusion,
    artifactCount: run.artifacts.length,
    logCount: run.logs.length,
    hasValidation: run.validationResult ? 'yes' : 'no',
    validationResult: run.validationResult,
    artifacts: run.artifacts,
    logs: run.logs,
  }));
  
  let html = renderTable(columns, rows, {
    id: 'runs-table',
    sortable: true,
  });
  
  // Add expandable row details
  html += `
    <script>
      document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.row-toggle');
        if (toggle) {
          const row = toggle.closest('tr');
          const nextRow = row.nextElementSibling;
          
          if (nextRow && nextRow.classList.contains('expanded-row')) {
            // Collapse
            nextRow.remove();
            toggle.textContent = '▶';
          } else {
            // Expand
            const rowData = JSON.parse(row.dataset.row);
            const detailRow = document.createElement('tr');
            detailRow.className = 'expanded-row';
            detailRow.innerHTML = '<td colspan="6">' + renderRunDetails(rowData) + '</td>';
            row.after(detailRow);
            toggle.textContent = '▼';
          }
        }
      });
      
      function renderRunDetails(run) {
        let html = '<div class="run-details">';
        
        // Artifacts
        if (run.artifacts && run.artifacts.length > 0) {
          html += '<h4>Artifacts</h4>';
          html += '<table class="detail-table"><thead><tr>';
          html += '<th>Name</th><th>Status</th><th>Size</th><th>Type</th></tr></thead><tbody>';
          run.artifacts.forEach(a => {
            const statusBadge = '<span class="badge badge-' + a.downloadStatus + '">' + a.downloadStatus + '</span>';
            const size = a.sizeBytes ? formatBytes(a.sizeBytes) : '';
            const type = a.detectedType || '';
            html += '<tr><td>' + a.name + '</td><td>' + statusBadge + '</td><td>' + size + '</td><td>' + type + '</td></tr>';
          });
          html += '</tbody></table>';
        }
        
        // Logs
        if (run.logs && run.logs.length > 0) {
          html += '<h4>Logs</h4>';
          html += '<table class="detail-table"><thead><tr>';
          html += '<th>Job Name</th><th>Status</th><th>Linter Outputs</th></tr></thead><tbody>';
          run.logs.forEach(l => {
            const statusBadge = '<span class="badge badge-' + l.extractionStatus + '">' + l.extractionStatus + '</span>';
            const linters = l.linterOutputs ? l.linterOutputs.length : 0;
            html += '<tr><td>' + l.jobName + '</td><td>' + statusBadge + '</td><td>' + linters + '</td></tr>';
          });
          html += '</tbody></table>';
        }
        
        // Validation
        if (run.validationResult) {
          html += '<h4>Validation Issues</h4>';
          const vr = run.validationResult;
          html += '<ul class="validation-list">';
          vr.missingRequired.forEach(v => {
            html += '<li class="validation-item-error"><code>' + v.pattern + '</code> (required)';
            if (v.reason) html += ' - ' + v.reason;
            html += '</li>';
          });
          vr.missingOptional.forEach(v => {
            html += '<li class="validation-item-warning"><code>' + v.pattern + '</code> (optional)';
            if (v.reason) html += ' - ' + v.reason;
            html += '</li>';
          });
          html += '</ul>';
        }
        
        html += '</div>';
        return html;
      }
      
      function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
      }
    </script>
  `;
  
  return html;
}
