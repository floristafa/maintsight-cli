#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';

// Import commands
import { createPredictCommand } from './commands/predict.command';

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
);

const program = new Command();

program
  .name('maintsight')
  .description('AI-powered maintenance risk predictor for git repositories')
  .version(packageJson.version);

// Add commands
program.addCommand(createPredictCommand());

// Default command - show help
program
  .command('help', { isDefault: true })
  .description('Show help information')
  .action(() => {
    program.outputHelp();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
