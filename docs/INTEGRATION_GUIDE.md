# MaintSight Integration Guide

This guide explains how to integrate MaintSight into your projects, CI/CD pipelines, and development workflows.

## 📚 Table of Contents

- [**CI/CD Integration**](#-cicd-integration)
  - [GitHub Actions](#github-actions)
  - [GitLab CI](#gitlab-ci)
  - [Jenkins](#jenkins)
- [**NPM Scripts**](#-npm-scripts)
- [**Pre-commit Hooks**](#-pre-commit-hooks)
- [**Programmatic Usage**](#-programmatic-usage)
- [**Monitoring & Alerts**](#-monitoring--alerts)

## 🔄 CI/CD Integration

### GitHub Actions

Create a workflow to check maintenance risk on pull requests:

```yaml
name: Maintenance Risk Check

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  risk-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Full history needed for analysis

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install MaintSight
        run: npm install -g maintsight

      - name: Run risk analysis
        run: |
          maintsight predict --format markdown > risk-report.md
          maintsight stats

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('risk-report.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Fail if critical risk
        run: |
          critical=$(maintsight predict -f json | jq '[.[] | select(.risk_score > 0.9)] | length')
          if [ "$critical" -gt "0" ]; then
            echo "❌ Found $critical files with critical risk!"
            exit 1
          fi
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
maintenance-check:
  stage: test
  image: node:18
  before_script:
    - npm install -g maintsight
  script:
    - maintsight predict --threshold 0.65 --format markdown > risk-report.md
    - maintsight stats
  artifacts:
    reports:
      junit: risk-report.md
  only:
    - merge_requests
    - main
```

### Jenkins

Add to your Jenkinsfile:

```groovy
pipeline {
  agent any

  stages {
    stage('Maintenance Check') {
      steps {
        sh 'npm install -g maintsight'
        sh 'maintsight predict --format json > risk-report.json'

        script {
          def report = readJSON file: 'risk-report.json'
          def highRisk = report.findAll { it.risk_score > 0.65 }

          if (highRisk.size() > 0) {
            echo "⚠️  Found ${highRisk.size()} high-risk files"
            currentBuild.result = 'UNSTABLE'
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'risk-report.json'
    }
  }
}
```

## 📦 NPM Scripts

Add MaintSight to your package.json scripts:

```json
{
  "scripts": {
    "maintenance:check": "maintsight predict",
    "maintenance:report": "maintsight predict -f markdown -o maintenance-report.md",
    "maintenance:stats": "maintsight stats",
    "maintenance:high-risk": "maintsight predict -t 0.65 -f json",
    "precommit": "maintsight predict -t 0.8 || echo 'Warning: High risk files detected'"
  }
}
```

## 🪝 Pre-commit Hooks

Using husky to check maintenance risk before commits:

```bash
npm install --save-dev husky
npx husky install
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check for high-risk files
high_risk=$(npx maintsight predict -f json -t 0.8 2>/dev/null | jq length)

if [ "$high_risk" -gt "0" ]; then
  echo "⚠️  Warning: $high_risk files have high maintenance risk (>0.8)"
  echo "Run 'maintsight predict -t 0.8' to see details"
  # Uncomment to block commit:
  # exit 1
fi
```

## 💻 Programmatic Usage

Integrate MaintSight into your build tools or scripts:

```javascript
const { GitCommitCollector, XGBoostPredictor } = require('maintsight');
const fs = require('fs').promises;

async function checkMaintenanceRisk() {
  const predictor = new XGBoostPredictor();
  await predictor.loadModel('./node_modules/maintsight/models/model.json');

  const collector = new GitCommitCollector(process.cwd());
  const commitData = collector.fetchCommitData(300);

  const predictions = predictor.predict(commitData);
  const highRisk = predictions.filter((p) => p.risk_score > 0.65);

  if (highRisk.length > 0) {
    console.warn(`⚠️  ${highRisk.length} high-risk files detected`);

    // Save report
    await fs.writeFile('high-risk-files.json', JSON.stringify(highRisk, null, 2));

    // Optionally fail the build
    if (highRisk.some((f) => f.risk_score > 0.9)) {
      process.exit(1);
    }
  }
}

checkMaintenanceRisk().catch(console.error);
```

## 📊 Monitoring & Alerts

### Slack Integration

Send alerts for high-risk files:

```javascript
const axios = require('axios');

async function sendSlackAlert(highRiskFiles) {
  const webhook = process.env.SLACK_WEBHOOK_URL;

  await axios.post(webhook, {
    text: `⚠️ Maintenance Risk Alert`,
    attachments: [
      {
        color: 'warning',
        fields: highRiskFiles.slice(0, 5).map((f) => ({
          title: f.module,
          value: `Risk: ${(f.risk_score * 100).toFixed(1)}%`,
          short: true,
        })),
      },
    ],
  });
}
```

### Dashboard Integration

Track trends over time:

```bash
#!/bin/bash
# Run daily and save results
DATE=$(date +%Y-%m-%d)
maintsight predict -f json > "reports/risk-${DATE}.json"

# Generate trend data
jq -s '[.[] | {
  date: input_filename | split("/")[-1] | split(".")[0] | split("-")[1:4] | join("-"),
  high_risk: [.[] | select(.risk_score > 0.65)] | length,
  total: length
}]' reports/risk-*.json > trend-data.json
```

## Best Practices

1. **Regular Analysis**: Run MaintSight weekly or on each release
2. **Track Trends**: Monitor risk scores over time
3. **Set Thresholds**: Define acceptable risk levels for your project
4. **Prioritize Refactoring**: Focus on files with consistently high risk
5. **Combine with Code Review**: Use risk scores to guide review efforts
