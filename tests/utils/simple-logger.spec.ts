import { Logger } from '../../src/utils/simple-logger';
import chalk from 'chalk';

describe('Logger', () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default info level', () => {
      const logger = new Logger('TestLogger');
      logger.info('test message');
      expect(stderrSpy).toHaveBeenCalled();
    });

    it('should create logger with custom level', () => {
      const logger = new Logger('TestLogger', 'error');
      logger.info('should not log');
      logger.error('should log');

      expect(stderrSpy).toHaveBeenCalledTimes(1); // only error
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('❌'));
    });
  });

  describe('log levels', () => {
    it('should respect debug level', () => {
      const logger = new Logger('TestLogger', 'debug');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(stdoutSpy).toHaveBeenCalledTimes(1); // debug uses stdout
      expect(stderrSpy).toHaveBeenCalledTimes(3); // info, warn, error use stderr
    });

    it('should respect info level', () => {
      const logger = new Logger('TestLogger', 'info');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(stdoutSpy).not.toHaveBeenCalled(); // debug not logged
      expect(stderrSpy).toHaveBeenCalledTimes(3); // info, warn, error
    });

    it('should respect warn level', () => {
      const logger = new Logger('TestLogger', 'warn');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledTimes(2); // warn and error
    });

    it('should respect error level', () => {
      const logger = new Logger('TestLogger', 'error');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledTimes(1); // only error
    });
  });

  describe('message formatting', () => {
    it('should format debug messages correctly', () => {
      const logger = new Logger('TestLogger', 'debug');
      logger.debug('test message', { foo: 'bar' });

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] [TestLogger]'));
      expect(stdoutSpy).toHaveBeenCalledWith(
        chalk.gray(JSON.stringify({ foo: 'bar' }, null, 2)) + '\n',
      );
    });

    it('should format info messages with emoji', () => {
      const logger = new Logger('TestLogger');
      logger.info('test message', '🚀');

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('🚀 test message'));
    });

    it('should format warn messages with default emoji', () => {
      const logger = new Logger('TestLogger');
      logger.warn('warning message');

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️ warning message'));
    });

    it('should format error messages with default emoji', () => {
      const logger = new Logger('TestLogger');
      logger.error('error message');

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('❌ error message'));
    });
  });

  describe('data logging', () => {
    it('should log debug data as JSON', () => {
      const logger = new Logger('TestLogger', 'debug');
      const data = { key: 'value', nested: { prop: 123 } };

      logger.debug('message', data);

      const calls = stdoutSpy.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(chalk.gray(JSON.stringify(data, null, 2)) + '\n');
    });

    it('should log warn data as JSON', () => {
      const logger = new Logger('TestLogger');
      const data = { warning: 'details' };

      logger.warn('warning', data);

      const calls = stderrSpy.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(chalk.yellow(JSON.stringify(data, null, 2)) + '\n');
    });

    it('should log error data as JSON', () => {
      const logger = new Logger('TestLogger');
      const data = { error: 'details', stack: 'trace' };

      logger.error('error', data);

      const calls = stderrSpy.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(chalk.red(JSON.stringify(data, null, 2)) + '\n');
    });
  });

  describe('timestamp formatting', () => {
    it('should include ISO timestamp in all messages', () => {
      const logger = new Logger('TestLogger', 'debug');
      const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      const allCalls = [...stdoutSpy.mock.calls, ...stderrSpy.mock.calls];

      allCalls.forEach((call) => {
        if (typeof call[0] === 'string' && !call[0].startsWith('{')) {
          expect(call[0]).toMatch(isoRegex);
        }
      });
    });
  });
});
