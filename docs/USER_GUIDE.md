# MaintSight User Guide

This guide provides comprehensive instructions for using MaintSight to analyze and predict maintenance risks in your git repositories.

## 📚 Table of Contents

- [**Installation**](#-installation)
- [**Quick Start**](#-quick-start)
- [**CLI Reference**](#-cli-reference)
  - [predict](#predict)
  - [stats](#stats)
- [**Output Formats**](#-output-formats)
- [**Risk Categories**](#-risk-categories)
- [**Configuration**](#-configuration)
- [**Usage Examples**](#-usage-examples)
- [**Troubleshooting**](#-troubleshooting)

## 📦 Installation

You can install MaintSight globally to use it as a command-line tool.

```bash
# Using npm
npm install -g maintsight

# Using yarn
yarn global add maintsight

# Using pnpm
pnpm add -g maintsight
```

## 🚀 Quick Start

### 1. Run a Basic Prediction

The simplest way to get started is by running a prediction on your current directory:

```bash
maintsight predict
```

This will analyze your git repository and output maintenance risk predictions in JSON format.

### 2. Get Repository Statistics

To see a detailed breakdown of your repository's maintenance health:

```bash
maintsight stats
```

### 3. Filter High-Risk Files

Focus on files that need immediate attention:

```bash
maintsight predict --threshold 0.65
```

## CLI Reference

### `predict`

Analyzes a git repository and predicts maintenance risks for each file.

```bash
maintsight predict [path] [options]
```

**Arguments:**

- `[path]`: Path to the git repository to analyze. Defaults to the current directory.

**Options:**

| Flag                      | Description                                     | Default |
| ------------------------- | ----------------------------------------------- | ------- |
| `-b, --branch <branch>`   | Git branch to analyze                           | `main`  |
| `-n, --max-commits <num>` | Maximum number of commits to analyze            | `300`   |
| `-o, --output <path>`     | Output file path (defaults to stdout)           | stdout  |
| `-f, --format <format>`   | Output format: `json`, `csv`, or `markdown`     | `json`  |
| `-t, --threshold <num>`   | Only show files with risk score above threshold | `0`     |
| `-v, --verbose`           | Enable verbose output with detailed logs        | `false` |

### `stats`

Shows detailed statistics about repository maintenance risk.

```bash
maintsight stats [path] [options]
```

**Arguments:**

- `[path]`: Path to the git repository to analyze. Defaults to the current directory.

**Options:**

| Flag                      | Description                          | Default |
| ------------------------- | ------------------------------------ | ------- |
| `-b, --branch <branch>`   | Git branch to analyze                | `main`  |
| `-n, --max-commits <num>` | Maximum number of commits to analyze | `300`   |

## 📊 Output Formats

### JSON Format

```json
[
  {
    "module": "src/services/user.service.ts",
    "risk_score": 0.823,
    "risk_category": "high-risk"
  }
]
```

### CSV Format

```csv
module,risk_score,risk_category
src/services/user.service.ts,0.823,high-risk
src/controllers/auth.controller.ts,0.652,medium-risk
```

### Markdown Format

```markdown
# Maintenance Risk Analysis

| File                               | Risk Score | Risk Category |
| ---------------------------------- | ---------- | ------------- |
| src/services/user.service.ts       | 0.823      | high-risk     |
| src/controllers/auth.controller.ts | 0.652      | medium-risk   |
```

## 🎯 Risk Categories

MaintSight categorizes files into four risk levels:

- **🔴 High Risk** (0.65-1.0): Critical maintenance concerns, requires immediate attention
- **🟡 Medium Risk** (0.47-0.65): Moderate concerns, should be scheduled for refactoring
- **🟢 Low Risk** (0.22-0.47): Minor concerns, can be addressed during regular maintenance
- **⚪ No Risk** (0-0.22): Healthy code, no immediate action needed

## ⚙️ Configuration

### Environment Variables

MaintSight respects the following environment variables:

- `MAINTSIGHT_MODEL_PATH`: Custom path to the XGBoost model file
- `MAINTSIGHT_LOG_LEVEL`: Logging level (ERROR, WARN, INFO, DEBUG)

### Saved Results

MaintSight automatically saves prediction results in CSV format to:

```
~/.maintsight/<repository-name>/<timestamp>.csv
```

This allows you to track maintenance risk trends over time.

## 📋 Usage Examples

### Analyze a Specific Repository

```bash
maintsight predict /path/to/repo
```

### Generate a Markdown Report

```bash
maintsight predict --format markdown --output report.md
```

### Analyze Feature Branch

```bash
maintsight predict --branch feature/new-feature
```

### Quick Analysis (Last 100 Commits)

```bash
maintsight predict --max-commits 100
```

### CI/CD Integration

```bash
# Fail if any file has risk score > 0.8
maintsight predict --format json --threshold 0.8 || exit 1
```

## 🔍 Troubleshooting

### Common Issues

1. **"Not a git repository" error**
   - Ensure you're running MaintSight in a directory with a `.git` folder
   - Initialize git if needed: `git init`

2. **"Branch not found" error**
   - Check available branches: `git branch -a`
   - Use `--branch` to specify the correct branch

3. **No output or empty results**
   - Ensure the repository has commit history
   - Try increasing `--max-commits` for more data
   - Check that there are source code files (not just configs/docs)

4. **Model not found error**
   - Ensure the npm package was installed correctly
   - Check that `models/model.json` exists in the package

### Getting Help

- View command help: `maintsight --help`
- View subcommand help: `maintsight predict --help`
- Report issues: [GitHub Issues](https://github.com/maintsight/maintsight/issues)
