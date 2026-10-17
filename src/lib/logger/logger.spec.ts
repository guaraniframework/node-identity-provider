import { Logger } from './logger';
import { LoggerLevel } from './logger-level.enum';

class CustomLogger extends Logger {
  protected readonly loggerLevel: LoggerLevel = LoggerLevel.TRACE;
  protected log(_loggerLevel: LoggerLevel, _message: string, _location: string, ..._parameters: unknown[]): void {}
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
        LoggerLevel.CRITICAL,
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
      Reflect.set(logger, 'loggerLevel', LoggerLevel.CRITICAL);
      logger.error('Error Message.', 'error-location', null, new Error('Error.'), 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log an error level message.', () => {
      const message = 'Error Message: Business Rule Error.';
      const error = new Error('Error.');

      logger.error(message, 'error-location', { data: 'foobar' }, error, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LoggerLevel.ERROR,
        message,
        'error-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });
  });

  describe('warn()', () => {
    it('should not log a warn level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'loggerLevel', LoggerLevel.ERROR);
      logger.warn('Warn Message.', 'warn-location', null, null, 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a warn level message.', () => {
      const message = 'Warn Message: Business Rule Warn.';
      const error = new Error('Warn.');

      logger.warn(message, 'warn-location', { data: 'foobar' }, error, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LoggerLevel.WARN,
        message,
        'warn-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });
  });

  describe('info()', () => {
    it('should not log an info level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'loggerLevel', LoggerLevel.WARN);
      logger.info('Info Message.', 'info-location', null, 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log an info level message.', () => {
      const message = 'Info Message: Business Rule Info.';
      logger.info(message, 'info-location', { data: 'foobar' }, 'parameter');
      expect(logSpy).toHaveBeenCalledWith(LoggerLevel.INFO, message, 'info-location', { data: 'foobar' }, 'parameter');
    });
  });

  describe('debug()', () => {
    it('should not log a debug level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'loggerLevel', LoggerLevel.INFO);
      logger.debug('Debug Message.', 'debug-location', null, 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a debug level message.', () => {
      const message = 'Debug Message: Business Rule Debug.';

      logger.debug(message, 'debug-location', { data: 'foobar' }, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LoggerLevel.DEBUG,
        message,
        'debug-location',
        { data: 'foobar' },
        'parameter',
      );
    });
  });

  describe('trace()', () => {
    it('should not log a trace level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'loggerLevel', LoggerLevel.DEBUG);
      logger.trace('Trace Message.', 'trace-location', null, 'parameter');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log a trace level message.', () => {
      const message = 'Trace Message: Business Rule Trace.';

      logger.trace(message, 'trace-location', { data: 'foobar' }, 'parameter');

      expect(logSpy).toHaveBeenCalledWith(
        LoggerLevel.TRACE,
        message,
        'trace-location',
        { data: 'foobar' },
        'parameter',
      );
    });
  });
});
