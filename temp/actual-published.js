#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const find_package_json_1 = require("./utils/find-package-json");
const predict_command_1 = require("./commands/predict.command");
const stats_command_1 = require("./commands/stats.command");
const packageJson = (0, find_package_json_1.findPackageJson)();
const program = new commander_1.Command();
program
    .name('maintsight')
    .description('AI-powered maintenance risk predictor for git repositories')
    .version(packageJson.version);
program.addCommand((0, predict_command_1.createPredictCommand)());
program.addCommand((0, stats_command_1.createStatsCommand)());
program
    .command('help', { isDefault: true })
    .description('Show help information')
    .action(() => {
    program.outputHelp();
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=maintsight-cli.js.map