# Maintenance Predictor

An XGBoost-based CLI tool for predicting maintenance risk in git repositories. Analyzes commit history and code patterns to identify files that may require attention.

## Features

- 🔍 **Git History Analysis**: Analyzes commit patterns, bug fixes, and author contributions
- 🤖 **XGBoost Predictions**: Uses machine learning to predict maintenance risk scores
- 📊 **Multiple Output Formats**: JSON, CSV, or Markdown reports
- 📈 **Detailed Statistics**: Risk distribution, top risky files, and commit patterns
- 🎯 **Threshold Filtering**: Focus on files above a certain risk level

## Installation

```bash
npm install -g maintenance-predictor
```

Or run locally:

```bash
npm install
npm run build
```

## Usage

### Basic Prediction

```bash
# Analyze current directory
maintenance-predictor predict

# Analyze specific repository
maintenance-predictor predict /path/to/repo

# Save results to file
maintenance-predictor predict -o results.json
```

### Options

```bash
maintenance-predictor predict [options] [path]

Options:
  -b, --branch <branch>      Git branch to analyze (default: "main")
  -n, --max-commits <num>    Max commits to analyze (default: 300)
  -o, --output <path>        Output file path (default: stdout)
  -f, --format <format>      Output format: json, csv, markdown (default: "json")
  -t, --threshold <num>      Only show files above risk threshold 0-1
  -v, --verbose              Verbose output
```

### View Statistics

```bash
# Show repository statistics
maintenance-predictor stats /path/to/repo

# Show detailed statistics
maintenance-predictor stats -d
```

## Output Format

### Risk Scores

- **0.00-0.22**: No Risk - Well-maintained code
- **0.22-0.47**: Low Risk - Minor maintenance needs
- **0.47-0.65**: Medium Risk - Moderate attention required
- **0.65-1.00**: High Risk - Critical maintenance needed

### JSON Output Example

```json
[
  {
    "module": "src/complex-module.ts",
    "risk_score": 0.7823,
    "risk_category": "high-risk"
  },
  {
    "module": "src/stable-module.ts",
    "risk_score": 0.1234,
    "risk_category": "no-risk"
  }
]
```

### CSV Output Example

```csv
file,risk_score,risk_category
"src/complex-module.ts","0.7823","high-risk"
"src/stable-module.ts","0.1234","no-risk"
```

## Model Information

The predictor uses an XGBoost model trained on the following features:

- Lines added/removed
- Number of commits (PRs)
- Unique authors
- Bug fix ratio
- Code churn metrics
- Collaboration complexity
- And more...

## Requirements

- Node.js >= 18.0.0
- Git repository with commit history
- XGBoost model file in `models/model.json`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## License

Apache-2.0
