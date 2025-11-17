# 🔍 MaintSight

[![npm version](https://img.shields.io/npm/v/maintsight.svg)](https://www.npmjs.com/package/maintsight)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

> **AI-powered maintenance degradation predictor for git repositories using XGBoost machine learning**

MaintSight analyzes your git repository's commit history and code patterns to predict maintenance degradation at the file level. Using a trained XGBoost model, it identifies code quality trends and helps prioritize refactoring efforts by detecting files that are degrading over time.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [Output Formats](#-output-formats)
- [Degradation Categories](#-degradation-categories)
- [Command Reference](#-command-reference)
- [Model Information](#-model-information)
- [Development](#-development)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🤖 **XGBoost ML Predictions**: Pre-trained model for maintenance degradation scoring
- 📊 **Git History Analysis**: Analyzes commits, changes, and collaboration patterns
- 📈 **Multiple Output Formats**: JSON, CSV, Markdown, or interactive HTML reports
- 🎯 **Degradation Categorization**: Four-level classification (Improved/Stable/Degraded/Severely Degraded)
- 🔍 **Threshold Filtering**: Focus on degraded files only
- 🌐 **Interactive HTML Reports**: Rich, interactive analysis with visualizations
- ⚡ **Fast & Efficient**: Analyzes hundreds of files in seconds
- 🛠️ **Easy Integration**: Simple CLI interface and npm package

## 🚀 Quick Start

```bash
# Install globally
npm install -g maintsight

# Run predictions on current directory (generates interactive HTML report)
maintsight predict

# Show only degraded files
maintsight predict -t 0.1

# Generate markdown report
maintsight predict -f markdown -o report.md

# Generate standalone HTML report
maintsight predict -f html -o report.html
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
git clone https://github.com/floristafa/maintsight-cli.git
cd maintsight-cli
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

# Limit commit analysis window
maintsight predict -w 90  # Analyze last 90 days

# Limit number of commits
maintsight predict -n 5000

# Filter by degradation threshold
maintsight predict -t 0.1  # Show only degraded files

# Generate CSV for Excel
maintsight predict -f csv -o analysis.csv

# Generate standalone HTML report
maintsight predict -f html -o report.html

# Verbose output for debugging
maintsight predict -v
```

## 📊 Output Formats

### JSON (Default)

```json
[
  {
    "module": "src/legacy/parser.ts",
    "degradation_score": 0.3456,
    "raw_prediction": 0.3456,
    "risk_category": "severely_degraded"
  },
  {
    "module": "src/utils/helpers.ts",
    "degradation_score": -0.1234,
    "raw_prediction": -0.1234,
    "risk_category": "improved"
  }
]
```

### CSV

```csv
module,degradation_score,raw_prediction,risk_category
"src/legacy/parser.ts","0.3456","0.3456","severely_degraded"
"src/utils/helpers.ts","-0.1234","-0.1234","improved"
```

### Markdown Report

Generates a comprehensive report with:

- Degradation distribution summary
- Top 20 most degraded files
- Category breakdown with percentages
- Actionable recommendations

### Interactive HTML Report

Always generated automatically in `.maintsight/` folder with:

- Visual degradation trends
- Interactive file explorer
- Detailed metrics per file
- Commit history analysis

## 🎯 Degradation Categories

| Score Range | Category             | Description                      | Action                     |
| ----------- | -------------------- | -------------------------------- | -------------------------- |
| < 0.0       | 🟢 Improved          | Code quality improving over time | Continue good practices    |
| 0.0-0.1     | 🔵 Stable            | Code quality stable              | Regular maintenance        |
| 0.1-0.2     | 🟡 Degraded          | Code quality declining           | Schedule for refactoring   |
| > 0.2       | 🔴 Severely Degraded | Rapid quality decline            | Immediate attention needed |

## 📚 Command Reference

### `maintsight predict`

Analyze repository and predict maintenance degradation.

```bash
maintsight predict [path] [options]
```

**Options:**

- `-b, --branch <branch>` - Git branch to analyze (default: "main")
- `-n, --max-commits <n>` - Maximum commits to analyze (default: 10000)
- `-w, --window-size-days <n>` - Time window in days for analysis (default: 150)
- `-o, --output <path>` - Output file path
- `-f, --format <fmt>` - Output format: json|csv|markdown|html (default: "json")
- `-t, --threshold <n>` - Degradation threshold filter (show files above this score)
- `-v, --verbose` - Verbose output

### `maintsight help`

Show help information.

```bash
maintsight help
```

## 🧠 Model Information

MaintSight uses an XGBoost model trained on software maintenance degradation patterns. The model predicts how code quality changes over time by analyzing git commit patterns and code evolution metrics.

### Key Features Analyzed

The model considers multiple dimensions of code evolution:

- **Commit patterns**: Frequency, size, and timing of changes
- **Author collaboration**: Number of contributors and collaboration patterns
- **Code churn**: Lines added, removed, and modified over time
- **Change consistency**: Regularity and predictability of modifications
- **Bug indicators**: Patterns suggesting defects or fixes
- **Temporal factors**: File age and time since last modification

### Prediction Output

- **degradation_score**: Numerical score indicating code quality trend
  - Negative values: Quality improving
  - Positive values: Quality degrading
  - Higher magnitude = stronger trend
- **risk_category**: Classification based on degradation severity
- **raw_prediction**: Unprocessed model output

## 🔧 Development

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.3.0
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/floristafa/maintsight-cli.git
cd maintsight-cli

# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run cli:dev predict ./test-repo
```

### Project Structure

```
maintsight-cli/
├── src/
│   ├── services/          # Core services
│   │   ├── git-commit-collector.ts
│   │   ├── feature-engineer.ts
│   │   └── xgboost-predictor.ts
│   ├── interfaces/       # TypeScript interfaces
│   │   ├── risk-prediction.interface.ts
│   │   ├── risk-category.enum.ts
│   │   └── ...
│   ├── utils/            # Utilities
│   │   └── simple-logger.ts
│   └── index.ts          # Main exports
├── cli/
│   ├── commands/         # CLI commands
│   │   └── predict.command.ts
│   ├── utils/           # CLI utilities
│   │   └── html-generator.ts
│   └── maintsight-cli.ts # CLI entry point
├── cli/models/
│   └── xgboost-model.json # XGBoost model
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

Found a bug? Please [open an issue](https://github.com/floristafa/maintsight-cli/issues/new) with:

- MaintSight version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/stack traces

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- XGBoost community for the excellent gradient boosting framework
- Git community for robust version control
- All contributors who help improve MaintSight

---

**Made with ❤️ by the TechDebtGPT Team**

[Repository](https://github.com/floristafa/maintsight-cli) | [Documentation](https://github.com/floristafa/maintsight-cli#readme) | [Issues](https://github.com/floristafa/maintsight-cli/issues)
