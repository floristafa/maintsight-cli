import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private name: string;
  private level: LogLevel;
  private static logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(name: string, level: LogLevel = 'info') {
    this.name = name;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.logLevels[level] >= Logger.logLevels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, emoji?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.name}]`;
    const emojiPrefix = emoji ? `${emoji} ` : '';
    return `${prefix} ${emojiPrefix}${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      process.stdout.write(chalk.gray(this.formatMessage('debug', message)) + '\n');
      if (data) process.stdout.write(chalk.gray(JSON.stringify(data, null, 2)) + '\n');
    }
  }

  info(message: string, emoji?: string): void {
    if (this.shouldLog('info')) {
      process.stderr.write(chalk.cyan(this.formatMessage('info', message, emoji)) + '\n');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      process.stderr.write(chalk.yellow(this.formatMessage('warn', message, '⚠️')) + '\n');
      if (data) process.stderr.write(chalk.yellow(JSON.stringify(data, null, 2)) + '\n');
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      process.stderr.write(chalk.red(this.formatMessage('error', message, '❌')) + '\n');
      if (data) process.stderr.write(chalk.red(JSON.stringify(data, null, 2)) + '\n');
    }
  }
}
