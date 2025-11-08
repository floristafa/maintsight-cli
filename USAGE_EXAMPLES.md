# Maintenance Predictor - Usage Examples

## Basic Usage

### 1. Analyze Current Repository

```bash
# Run predictions on current directory
maintenance-predictor predict

# Show only high-risk files
maintenance-predictor predict -t 0.65

# Save as CSV
maintenance-predictor predict -f csv -o results.csv
```

### 2. Analyze Different Repository

```bash
# Analyze specific repo
maintenance-predictor predict /path/to/repo

# Analyze different branch
maintenance-predictor predict /path/to/repo -b develop

# Limit commit history
maintenance-predictor predict -n 100
```

### 3. Generate Reports

```bash
# Markdown report
maintenance-predictor predict -f markdown -o report.md

# JSON with verbose output
maintenance-predictor predict -v -o analysis.json

# CSV for Excel/data analysis
maintenance-predictor predict -f csv -o maintenance-scores.csv
```

### 4. View Statistics

```bash
# Basic stats
maintenance-predictor stats

# Detailed statistics
maintenance-predictor stats -d

# Stats for specific branch
maintenance-predictor stats -b feature/new-feature
```

## Output Examples

### JSON Output

```json
[
  {
    "module": "src/services/complex-service.ts",
    "risk_score": 0.8234,
    "risk_category": "high-risk"
  },
  {
    "module": "src/utils/helpers.ts",
    "risk_score": 0.1523,
    "risk_category": "no-risk"
  }
]
```

### CSV Output

```csv
file,risk_score,risk_category
"src/services/complex-service.ts","0.8234","high-risk"
"src/utils/helpers.ts","0.1523","no-risk"
```

### Markdown Report

Shows:

- Risk distribution summary
- Top 20 high-risk files
- Detailed metrics
- Actionable insights

## Integration Examples

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Run Maintenance Analysis
  run: |
    npx maintenance-predictor predict -t 0.65 -o high-risk-files.json
    if [ -s high-risk-files.json ]; then
      echo "⚠️ High-risk files detected"
      cat high-risk-files.json
    fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# Check files being committed for high risk
changed_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|py)$')
if [ -n "$changed_files" ]; then
  maintenance-predictor predict -t 0.7 -f json | jq -r '.[] | select(.module as $m | $changed_files | contains($m))'
fi
```

### Regular Monitoring

```bash
# Weekly maintenance report
0 0 * * 0 cd /path/to/repo && maintenance-predictor predict -f markdown -o reports/maintenance-$(date +%Y%m%d).md
```

## Interpreting Results

- **0.00-0.22**: ✅ No Risk - Well-maintained, stable code
- **0.22-0.47**: 🟡 Low Risk - Minor issues, routine maintenance
- **0.47-0.65**: 🟠 Medium Risk - Needs attention soon
- **0.65-1.00**: 🔴 High Risk - Critical, prioritize refactoring
