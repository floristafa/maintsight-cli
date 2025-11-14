import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { GitCommitCollector } from '../../src/services/git-commit-collector';
import { XGBoostPredictor } from '../../src/services/xgboost-predictor';
import { getPackageRoot } from '../utils/find-package-json';
import { generateHTMLReport, formatAsHTML } from '../utils/html-generator';

interface PredictOptions {
  branch?: string;
  maxCommits?: number;
  windowSizeDays?: number;
  output?: string;
  format?: 'json' | 'csv' | 'markdown' | 'html';
  threshold?: number;
  verbose?: boolean;
}

export function createPredictCommand(): Command {
  const command = new Command('predict');

  command
    .description('Run maintenance risk predictions on a git repository')
    .argument('[path]', 'Path to git repository (default: current directory)', '.')
    .option('-b, --branch <branch>', 'Git branch to analyze', 'main')
    .option('-n, --max-commits <number>', 'Maximum number of commits to analyze', '10000')
    .option('-w, --window-size-days <number>', 'Time window in days for commit analysis', '150')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-f, --format <format>', 'Output format: json, csv, markdown, html', 'json')
    .option('-t, --threshold <number>', 'Only show files above degradation threshold', '0')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (repoPath: string, options: PredictOptions) => {
      const spinner = ora('Initializing...').start();

      try {
        // Resolve paths
        const resolvedPath = path.resolve(repoPath);
        // Find model path relative to package root
        const packageRoot = getPackageRoot(__dirname);
        const modelPath = path.join(packageRoot, 'models', 'model.json');

        // Initialize services
        spinner.text = 'Loading XGBoost model...';
        const predictor = new XGBoostPredictor();
        await predictor.loadModel(modelPath);

        // Collect git data
        spinner.text = `Analyzing git history (branch: ${options.branch})...`;
        const gitCollector = new GitCommitCollector(
          resolvedPath,
          options.branch || 'main',
          options.windowSizeDays || 150,
        );
        const commitData = gitCollector.fetchCommitData(options.maxCommits || 10000);

        if (commitData.length === 0) {
          spinner.fail('No source files found in git history');
          process.exit(1);
        }

        spinner.text = `Running predictions on ${commitData.length} files...`;

        // Run predictions
        const predictions = predictor.predict(commitData);

        // Filter by threshold if specified
        let results = predictions;
        const threshold = options.threshold ?? 0;
        if (threshold > 0) {
          results = predictions.filter((p) => (p.degradation_score || p.risk_score) >= threshold);
        }

        spinner.succeed(`Predictions complete: ${results.length} files analyzed`);

        // Generate HTML report in repo's .maintsight folder
        const htmlPath = await generateHTMLReport(results, commitData, resolvedPath);

        // Format and output results if requested
        if (options.output) {
          if (options.format === 'html') {
            // For HTML format, use the HTML generator
            const htmlContent = formatAsHTML(results, commitData, resolvedPath);
            const fs = await import('fs/promises');
            await fs.writeFile(options.output, htmlContent, 'utf-8');
          } else {
            const output = formatResults(results, options.format || 'json', resolvedPath);
            const fs = await import('fs/promises');
            await fs.writeFile(options.output, output, 'utf-8');
          }
          console.log(chalk.green(`✓ Results saved to: ${options.output}`));
        } else {
          // Show JSON output by default
          const output = formatResults(results, options.format || 'html', resolvedPath);
          console.log(output);
        }

        // Always show the HTML report link
        if (htmlPath) {
          console.log(chalk.green(`\n🌐 Interactive HTML report: file://${htmlPath}`));
          console.log(chalk.dim(`   Click the link above to open in your browser`));
        }

        // Show summary
        if (options.format !== 'json') {
          showSummary(results);
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        if (options.verbose && error instanceof Error) {
          console.error(chalk.red(error.stack));
        }
        process.exit(1);
      }
    });

  return command;
}

function formatResults(predictions: any[], format: string, repoPath: string): string {
  switch (format) {
    case 'csv':
      return formatAsCSV(predictions);
    case 'markdown':
      return formatAsMarkdown(predictions, repoPath);
    case 'json':
    default:
      return JSON.stringify(predictions, null, 2);
  }
}

function formatAsCSV(predictions: any[]): string {
  const headers = ['module', 'degradation_score', 'raw_prediction', 'risk_category'];
  const rows = predictions.map((p) => [
    p.module,
    (p.degradation_score || p.risk_score).toFixed(4),
    (p.raw_prediction || p.risk_score).toFixed(4),
    p.risk_category,
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n',
  );
}

function formatAsMarkdown(predictions: any[], repoPath: string): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString();

  const sortedPredictions = [...predictions].sort(
    (a, b) => (b.degradation_score || b.risk_score) - (a.degradation_score || a.risk_score),
  );

  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return `# Maintenance Risk Analysis Report

**Repository:** ${repoName}
**Date:** ${timestamp}
**Files Analyzed:** ${predictions.length}

## Risk Distribution

| Risk Level | Count | Percentage |
|------------|-------|------------|
| Severely Degraded | ${riskDist['severely_degraded'] || 0} | ${(((riskDist['severely_degraded'] || 0) / predictions.length) * 100).toFixed(1)}% |
| Degraded | ${riskDist['degraded'] || 0} | ${(((riskDist['degraded'] || 0) / predictions.length) * 100).toFixed(1)}% |
| Stable | ${riskDist['stable'] || 0} | ${(((riskDist['stable'] || 0) / predictions.length) * 100).toFixed(1)}% |
| Improved | ${riskDist['improved'] || 0} | ${(((riskDist['improved'] || 0) / predictions.length) * 100).toFixed(1)}% |

## Top 20 High-Risk Files

| File | Degradation Score | Category |
|------|------------------|----------|
${sortedPredictions
  .slice(0, 20)
  .map(
    (p) =>
      `| \`${p.module}\` | ${(p.degradation_score || p.risk_score).toFixed(4)} | ${p.risk_category} |`,
  )
  .join('\n')}

## Risk Categories

- **Severely Degraded (> 0.2)**: Critical attention needed - code quality declining rapidly
- **Degraded (0.1-0.2)**: Moderate degradation - consider refactoring
- **Stable (0.0-0.1)**: Code quality stable - minimal degradation
- **Improved (< 0.0)**: Code quality improving - good maintenance practices

---
*Generated by Maintenance Predictor using XGBoost*`;
}

function showSummary(predictions: any[]): void {
  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(chalk.cyan('\nSummary:'));
  console.log(`Total files: ${predictions.length}`);
  console.log(`Severely degraded: ${chalk.red(riskDist['severely_degraded'] || 0)}`);
  console.log(`Degraded: ${chalk.yellow(riskDist['degraded'] || 0)}`);
  console.log(`Stable: ${chalk.blue(riskDist['stable'] || 0)}`);
  console.log(`Improved: ${chalk.green(riskDist['improved'] || 0)}`);
}
