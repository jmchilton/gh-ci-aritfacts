# Exit Codes

The CLI returns specific exit codes to indicate the success or failure of the operation, useful for automation and CI/CD pipelines.

## Exit Code Reference

| Code | Status | Meaning |
|------|--------|---------|
| `0` | ✅ Complete | All artifacts downloaded and processed successfully |
| `1` | ⚠️ Partial | Some artifacts downloaded/processed, but some failed |
| `2` | ❌ Incomplete | Critical failure, most artifacts not retrieved |

## Usage in Scripts

### Bash

```bash
gh-ci-artifacts 123 --repo owner/repo
case $? in
  0)
    echo "All artifacts retrieved successfully"
    ;;
  1)
    echo "Some artifacts failed, check logs"
    ;;
  2)
    echo "Critical failure, unable to retrieve artifacts"
    exit 1
    ;;
esac
```

## Interpreting Results

### Exit Code 0: Complete
- All workflow runs processed
- All artifacts downloaded successfully
- All HTML reports converted
- All linter outputs extracted
- Check `summary.json` for detailed statistics

### Exit Code 1: Partial
- Some artifacts downloaded successfully
- Some downloads failed (check logs for reasons)
- Some HTML conversion failed (unsupported format)
- Some linter patterns not found
- **Action:** Review error logs, artifacts may still be usable
- **Check:** `summary.json` shows `status: "partial"`

### Exit Code 2: Incomplete
- No artifacts downloaded (network/auth failure)
- No workflow runs found
- Unable to contact GitHub API
- **Action:** Check authentication, network, and PR/branch existence
- **Review:** Error logs for specific failures
