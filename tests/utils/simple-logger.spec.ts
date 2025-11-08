import { Logger } from '../../src/utils/simple-logger';
import chalk from 'chalk';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default info level', () => {
      const logger = new Logger('TestLogger');
      logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should create logger with custom level', () => {
      const logger = new Logger('TestLogger', 'error');
      logger.info('should not log');
      logger.error('should log');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('log levels', () => {
    it('should respect debug level', () => {
      const logger = new Logger('TestLogger', 'debug');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug and info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect info level', () => {
      const logger = new Logger('TestLogger', 'info');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1); // only info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect warn level', () => {
      const logger = new Logger('TestLogger', 'warn');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should respect error level', () => {
      const logger = new Logger('TestLogger', 'error');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('message formatting', () => {
    it('should format debug messages correctly', () => {
      const logger = new Logger('TestLogger', 'debug');
      logger.debug('test message', { foo: 'bar' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] [TestLogger]'));
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify({ foo: 'bar' }, null, 2)),
      );
    });

    it('should format info messages with emoji', () => {
      const logger = new Logger('TestLogger');
      logger.info('test message', '🚀');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🚀 test message'));
    });

    it('should format warn messages with default emoji', () => {
      const logger = new Logger('TestLogger');
      logger.warn('warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('⚠️ warning message'));
    });

    it('should format error messages with default emoji', () => {
      const logger = new Logger('TestLogger');
      logger.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('❌ error message'));
    });
  });

  describe('data logging', () => {
    it('should log debug data as JSON', () => {
      const logger = new Logger('TestLogger', 'debug');
      const data = { key: 'value', nested: { prop: 123 } };

      logger.debug('message', data);

      expect(consoleSpy.log).toHaveBeenLastCalledWith(chalk.gray(JSON.stringify(data, null, 2)));
    });

    it('should log warn data as JSON', () => {
      const logger = new Logger('TestLogger');
      const data = { warning: 'details' };

      logger.warn('warning', data);

      expect(consoleSpy.warn).toHaveBeenLastCalledWith(chalk.yellow(JSON.stringify(data, null, 2)));
    });

    it('should log error data as JSON', () => {
      const logger = new Logger('TestLogger');
      const data = { error: 'details', stack: 'trace' };

      logger.error('error', data);

      expect(consoleSpy.error).toHaveBeenLastCalledWith(chalk.red(JSON.stringify(data, null, 2)));
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

      const allCalls = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.warn.mock.calls,
        ...consoleSpy.error.mock.calls,
      ];

      allCalls.forEach((call) => {
        expect(call[0]).toMatch(isoRegex);
      });
    });
  });
});
