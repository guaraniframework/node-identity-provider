import { LogLevel } from './log-level.enum';
import { Logger } from './logger';

class CustomLogger extends Logger {
  protected override readonly logLevel: LogLevel = LogLevel.TRACE;
  protected override log(_logLevel: LogLevel, _message: string, _location: string, ..._parameters: unknown[]): void {}
}

describe('Logger', () => {
  let logger: Logger;
  let logSpy: jest.SpyInstance<any, unknown[], any>;

  beforeEach(() => {
    logger = new CustomLogger();
    logSpy = jest.spyOn(logger, 'log' as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('critical()', () => {
    it('should log a critical level message.', () => {
      const message = 'Critical Error Message: Broken System.';
      const error = new Error('Critical Error.');

      logger.critical(message, 'critical-error-location', { data: 'foobar' }, error, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LogLevel.CRITICAL,
        message,
        'critical-error-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });
  });

  describe('error()', () => {
    it('should not log an error level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.CRITICAL);
      logger.error('Error Message.', 'error-location', 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log an error level message.', () => {
      const message = 'Error Message: Business Rule Error.';
      const error = new Error('Error.');

      logger.error(message, 'error-location', { data: 'foobar' }, error, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LogLevel.ERROR,
        message,
        'error-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });
  });

  describe('warning()', () => {
    it('should not log a warning level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.ERROR);
      logger.warning('Warning Message.', 'warning-location', 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a warning level message.', () => {
      const message = 'Warning Message: Business Rule Warning.';
      const error = new Error('Warning.');

      logger.warning(message, 'warning-location', { data: 'foobar' }, error, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LogLevel.WARNING,
        message,
        'warning-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });
  });

  describe('information()', () => {
    it('should not log an information level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.WARNING);
      logger.information('Information Message.', 'information-location', 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log an information level message.', () => {
      const message = 'Information Message: Business Rule Information.';

      logger.information(message, 'information-location', { data: 'foobar' }, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LogLevel.INFORMATION,
        message,
        'information-location',
        { data: 'foobar' },
        'parameter',
      );
    });
  });

  describe('debug()', () => {
    it('should not log a debug level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.INFORMATION);
      logger.debug('Debug Message.', 'debug-location', 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a debug level message.', () => {
      const message = 'Debug Message: Business Rule Debug.';
      logger.debug(message, 'debug-location', { data: 'foobar' }, 'parameter');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.DEBUG, message, 'debug-location', { data: 'foobar' }, 'parameter');
    });
  });

  describe('trace()', () => {
    it('should not log a trace level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.DEBUG);
      logger.trace('Trace Message.', 'trace-location', 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a trace level message.', () => {
      const message = 'Trace Message: Business Rule Trace.';
      logger.trace(message, 'trace-location', { data: 'foobar' }, 'parameter');
      expect(logSpy).toHaveBeenCalledWith(LogLevel.TRACE, message, 'trace-location', { data: 'foobar' }, 'parameter');
    });
  });
});
