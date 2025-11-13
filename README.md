# 🔍 MaintSight

[![npm version](https://img.shields.io/npm/v/maintsight.svg)](https://www.npmjs.com/package/maintsight)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

> **AI-powered maintenance risk predictor for git repositories using XGBoost machine learning**

MaintSight analyzes your git repository's commit history and code patterns to predict maintenance risks at the file level. Using a trained XGBoost model, it identifies technical debt hotspots and helps prioritize refactoring efforts.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [Output Formats](#-output-formats)
- [Risk Categories](#-risk-categories)
- [Command Reference](#-command-reference)
- [Model Information](#-model-information)
- [Development](#-development)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🤖 **XGBoost ML Predictions**: Pre-trained model for maintenance risk scoring
- 📊 **Git History Analysis**: Analyzes commits, bug fixes, and collaboration patterns
- 📈 **Multiple Output Formats**: JSON, CSV, or Markdown reports
- 🎯 **Risk Categorization**: Four-level risk classification (No/Low/Medium/High)
- 📉 **Statistical Analysis**: Detailed repository health metrics
- 🔍 **Threshold Filtering**: Focus on high-risk files only
- ⚡ **Fast & Efficient**: Analyzes hundreds of files in seconds
- 🛠️ **Easy Integration**: Simple CLI interface and npm package

## 🚀 Quick Start

```bash
# Install globally
npm install -g maintsight

# Run predictions on current directory
maintsight predict

# Show only high-risk files
maintsight predict -t 0.65

# Generate markdown report
maintsight predict -f markdown -o report.md
```

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g maintsight
```

### Local Installation

```bash
npm install maintsight
```

### From Source

```bash
git clone https://github.com/maintsight/maintsight.git
cd maintsight
npm install
npm run build
npm link
```

## 📖 Usage

### Basic Prediction

```bash
# Analyze current directory
maintsight predict

# Analyze specific repository
maintsight predict /path/to/repo

# Save results to file
maintsight predict -o results.json
```

### Advanced Options

```bash
# Analyze specific branch
maintsight predict -b develop

# Limit commit history
maintsight predict -n 500

# Filter by risk threshold
maintsight predict -t 0.65  # Show only high-risk files

# Generate CSV for Excel
maintsight predict -f csv -o analysis.csv

# Verbose output for debugging
maintsight predict -v
```

### View Statistics

```bash
# Basic statistics
maintsight stats

# Detailed statistics with file type breakdown
maintsight stats -d

# Stats for specific branch
maintsight stats -b feature/new-feature
```

## 📊 Output Formats

### JSON (Default)

```json
[
  {
    "module": "src/legacy/parser.ts",
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

### CSV

```csv
file,risk_score,risk_category
"src/legacy/parser.ts","0.8234","high-risk"
"src/utils/helpers.ts","0.1523","no-risk"
```

### Markdown Report

Generates a comprehensive report with:

- Risk distribution summary
- Top 20 high-risk files
- Visual risk breakdown
- Actionable recommendations

## 🎯 Risk Categories

| Score Range | Category       | Description                  | Action              |
| ----------- | -------------- | ---------------------------- | ------------------- |
| 0.00-0.22   | ✅ No Risk     | Well-maintained, stable code | Regular maintenance |
| 0.22-0.47   | 🟡 Low Risk    | Minor issues present         | Schedule for review |
| 0.47-0.65   | 🟠 Medium Risk | Needs attention              | Plan refactoring    |
| 0.65-1.00   | 🔴 High Risk   | Critical maintenance needed  | Immediate action    |

## 📚 Command Reference

### `maintsight predict`

Analyze repository and predict maintenance risks.

```bash
maintsight predict [path] [options]
```

**Options:**

- `-b, --branch <branch>` - Git branch to analyze (default: "main")
- `-n, --max-commits <n>` - Maximum commits to analyze (default: 300)
- `-o, --output <path>` - Output file path
- `-f, --format <fmt>` - Output format: json|csv|markdown (default: "json")
- `-t, --threshold <n>` - Risk threshold filter (0-1)
- `-v, --verbose` - Verbose output

### `maintsight stats`

Display repository maintenance statistics.

```bash
maintsight stats [path] [options]
```

**Options:**

- `-b, --branch <branch>` - Git branch to analyze (default: "main")
- `-n, --max-commits <n>` - Maximum commits to analyze (default: 300)
- `-d, --detailed` - Show detailed statistics

### `maintsight help`

Show help information.

```bash
maintsight help [command]
```

## 🧠 Model Information

MaintSight uses an XGBoost model trained on software maintenance patterns. The model analyzes 16 features:

### Primary Features

- **lines_added**: Total lines added
- **lines_deleted**: Total lines removed
- **churn**: Total code churn
- **prs**: Number of commits
- **unique_authors**: Number of contributors
- **bug_prs**: Bug fix commits

### Derived Features

- **bug_ratio**: Ratio of bug fixes to total commits
- **churn_per_pr**: Average churn per commit
- **lines_per_pr**: Average lines changed per commit
- **lines_per_author**: Code ownership concentration
- **author_concentration**: Inverse of unique authors
- **add_del_ratio**: Code growth ratio
- **deletion_ratio**: Code removal patterns
- **bug_density**: Bug fixes per line of code
- **collaboration_complexity**: Team coordination metric
- **feedback_count**: Review feedback (if available)

## 🔧 Development

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.3.0
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/maintsight/maintsight.git
cd maintsight

# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run cli:dev predict ./test-repo
```

### Project Structure

```
maintsight/
├── src/
│   ├── services/          # Core services
│   │   ├── git-commit-collector.ts
│   │   ├── feature-engineer.ts
│   │   └── xgboost-predictor.ts
│   ├── utils/            # Utilities
│   │   └── simple-logger.ts
│   └── index.ts          # Main exports
├── cli/
│   ├── commands/         # CLI commands
│   │   ├── predict.command.ts
│   │   └── stats.command.ts
│   └── maintsight-cli.ts # CLI entry point
├── models/
│   └── model.json        # XGBoost model
└── tests/               # Test files
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test
npm test -- git-commit-collector.spec.ts

# Watch mode
npm run test:watch
```

### Test Coverage Goals

- Services: 80%+
- Utils: 90%+
- CLI Commands: 70%+

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/maintsight/maintsight/issues/new) with:

- MaintSight version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/stack traces

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- XGBoost community for the excellent gradient boosting framework
- Git community for robust version control
- All contributors who help improve MaintSight

---

**Made with ❤️ by the MaintSight Team**

[Website](https://github.com/maintsight/maintsight) | [Documentation](https://github.com/maintsight/maintsight#readme) | [Issues](https://github.com/maintsight/maintsight/issues)
