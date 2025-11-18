import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { GitCommitCollector } from '../../src/services/git-commit-collector';
import { XGBoostPredictor } from '../../src/services/xgboost-predictor';
import { generateHTMLReport, formatAsHTML } from '../utils/html-generator';
import { RiskPrediction } from '@interfaces';

async function addToGitignore(repoPath: string): Promise<void> {
  try {
    const gitignorePath = path.join(repoPath, '.gitignore');
    const maintSightEntry = '.maintsight/';

    // Check if .gitignore exists
    let gitignoreContent = '';
    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    } catch (_error) {
      // .gitignore doesn't exist, we'll create it
    }

    // Check if .maintsight/ is already in .gitignore
    if (!gitignoreContent.includes('.maintsight')) {
      // Add .maintsight/ to .gitignore
      const newContent = gitignoreContent
        ? `${gitignoreContent.trimEnd()}\n\n# MaintSight reports\n${maintSightEntry}\n`
        : `# MaintSight reports\n${maintSightEntry}\n`;

      await fs.writeFile(gitignorePath, newContent, 'utf-8');
      console.log(chalk.dim(`   📝 Added .maintsight/ to .gitignore`));
    }
  } catch (error) {
    // Silently fail - not critical functionality
    console.log(
      chalk.dim(
        `   ⚠️  Could not update .gitignore (${error instanceof Error ? error.message : 'unknown error'})`,
      ),
    );
  }
}

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
    .option('-f, --format <format>', 'Output format: json, csv, markdown, html', 'html')
    .option('-t, --threshold <number>', 'Only show files above degradation threshold', '0')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (repoPath: string, options: PredictOptions) => {
      const spinner = ora('Initializing...').start();

      try {
        // Resolve paths
        const resolvedPath = path.resolve(repoPath);
        // Initialize services
        spinner.text = 'Loading XGBoost model...';
        const predictor = new XGBoostPredictor();
        predictor.loadModel();

        // Collect git data
        spinner.text = `Analyzing git history (branch: ${options.branch})...`;
        const gitCollector = new GitCommitCollector(
          resolvedPath,
          options.branch || 'main',
          options.windowSizeDays || 150,
          true, // Only analyze files that currently exist
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
          results = predictions.filter((p) => p.degradation_score >= threshold);
        }

        spinner.succeed(`Predictions complete: ${results.length} files analyzed`);

        // Generate HTML report in repo's .maintsight folder
        const htmlPath = await generateHTMLReport(results, commitData, resolvedPath);

        // Add .maintsight/ to .gitignore if not already present
        await addToGitignore(resolvedPath);

        // Format and output results if requested
        if (options.output) {
          if (options.format === 'html') {
            // For HTML format, use the HTML generator
            const htmlContent = formatAsHTML(results, commitData, resolvedPath);
            await fs.writeFile(options.output, htmlContent, 'utf-8');
          } else {
            const output = formatResults(results, options.format || 'json', resolvedPath);
            await fs.writeFile(options.output, output, 'utf-8');
          }
          console.log(chalk.green(`✓ Results saved to: ${options.output}`));
        }

        // Always show the HTML report link
        if (htmlPath) {
          const fileUrl = `file://${htmlPath}`;
          const relativePath = path.relative(process.cwd(), htmlPath);

          // Check terminal type for fallback display
          const isMac = process.platform === 'darwin';
          const isITerm2 = process.env.TERM_PROGRAM === 'iTerm.app';

          console.log(chalk.green(`\n🌐 Interactive HTML report generated!`));
          console.log(chalk.blue(`   📁 File: ${relativePath}`));
          console.log(chalk.dim(`   💡 Opening in browser automatically...`));

          // Auto-open in default browser for all terminals
          const openCommand =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'start'
                : 'xdg-open';

          exec(`${openCommand} "${fileUrl}"`, (error) => {
            if (error) {
              // Fallback: show URL for manual copy-paste
              console.log(chalk.yellow(`   ⚠️  Auto-open failed, use manual link below:`));
              if (isMac && (isITerm2 || process.env.TERM_PROGRAM === 'Apple_Terminal')) {
                // Show clickable link for supported terminals
                console.log(
                  chalk.cyan(`   🌐 Browser: \x1b]8;;${fileUrl}\x1b\\${fileUrl}\x1b]8;;\x1b\\`),
                );
                console.log(chalk.dim(`   💡 Cmd+click the link above to open`));
              } else {
                // Plain URL for all other cases
                console.log(chalk.cyan(`   🌐 Browser: ${fileUrl}`));
                console.log(chalk.dim(`   💡 Copy & paste the URL above in your browser`));
              }
            } else {
              console.log(chalk.green(`   ✅ Report opened in browser`));
            }
          });
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

function formatResults(predictions: RiskPrediction[], format: string, repoPath: string): string {
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

function formatAsCSV(predictions: RiskPrediction[]): string {
  const headers = ['module', 'degradation_score', 'raw_prediction', 'risk_category'];
  const rows = predictions.map((p) => [
    p.module,
    p.degradation_score.toFixed(4),
    p.raw_prediction.toFixed(4),
    p.risk_category,
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n',
  );
}

function formatAsMarkdown(predictions: RiskPrediction[], repoPath: string): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString();

  const sortedPredictions = [...predictions].sort(
    (a, b) => b.degradation_score - a.degradation_score,
  );

  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return `# MaintSight - Maintenance Risk Analysis Report

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
  .map((p) => `| \`${p.module}\` | ${p.degradation_score.toFixed(4)} | ${p.risk_category} |`)
  .join('\n')}

## Risk Categories

- **Severely Degraded (> 0.2)**: Critical attention needed - code quality declining rapidly
- **Degraded (0.1-0.2)**: Moderate degradation - consider refactoring
- **Stable (0.0-0.1)**: Code quality stable - minimal degradation
- **Improved (< 0.0)**: Code quality improving - good maintenance practices

---
*Generated by MaintSight using XGBoost*`;
}

function showSummary(predictions: RiskPrediction[]): void {
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
