import { ConsoleLogger } from './console.logger';
import { LogLevel } from './log-level.enum';

describe('Console Logger', () => {
  let logger: ConsoleLogger;

  let errorSpy: jest.SpyInstance<void, any[], any>;
  let warnSpy: jest.SpyInstance<void, any[], any>;
  let infoSpy: jest.SpyInstance<void, any[], any>;
  let debugSpy: jest.SpyInstance<void, any[], any>;
  let traceSpy: jest.SpyInstance<void, any[], any>;

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 12, 0, 0, 0, 0) });
  });

  beforeEach(() => {
    logger = new ConsoleLogger();

    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    traceSpy = jest.spyOn(console, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('critical()', () => {
    it('should log a critical level message.', () => {
      const message = 'Critical Error Message: Broken System.';
      const error = new Error('Critical Error.');

      logger.critical(message, 'critical-error-location', { data: 'foobar' }, error);

      expect(errorSpy).toHaveBeenCalledWith(
        '[Critical] [2026-08-12T03:00:00.000Z] Critical Error Message: Broken System.',
        'critical-error-location',
        { data: 'foobar' },
        error,
      );
    });
  });

  describe('error()', () => {
    it('should not log an error level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.CRITICAL);
      logger.error('Error Message.', 'error-location');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log an error level message.', () => {
      const message = 'Error Message: Business Rule Error.';
      const error = new Error('Error.');

      logger.error(message, 'error-location', { data: 'foobar' }, error);

      expect(errorSpy).toHaveBeenCalledWith(
        '[Error] [2026-08-12T03:00:00.000Z] Error Message: Business Rule Error.',
        'error-location',
        { data: 'foobar' },
        error,
      );
    });
  });

  describe('warning()', () => {
    it('should not log a warning level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.ERROR);
      logger.warning('Warning Message.', 'warning-location');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log a warning level message.', () => {
      const message = 'Warning Message: Business Rule Warning.';
      const error = new Error('Warning.');

      logger.warning(message, 'warning-location', { data: 'foobar' }, error);

      expect(warnSpy).toHaveBeenCalledWith(
        '[Warning] [2026-08-12T03:00:00.000Z] Warning Message: Business Rule Warning.',
        'warning-location',
        { data: 'foobar' },
        error,
      );
    });
  });

  describe('information()', () => {
    it('should not log an information level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.WARNING);
      logger.information('Information Message.', 'information-location');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('should log an information level message.', () => {
      const message = 'Information Message: Business Rule Information.';

      logger.information(message, 'information-location', { data: 'foobar' });

      expect(infoSpy).toHaveBeenCalledWith(
        '[Information] [2026-08-12T03:00:00.000Z] Information Message: Business Rule Information.',
        'information-location',
        { data: 'foobar' },
      );
    });
  });

  describe('debug()', () => {
    it('should not log a debug level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.INFORMATION);
      logger.debug('Debug Message.', 'debug-location');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('should log a debug level message.', () => {
      const message = 'Debug Message: Business Rule Debug.';

      logger.debug(message, 'debug-location', { data: 'foobar' });

      expect(debugSpy).toHaveBeenCalledWith(
        '[Debug] [2026-08-12T03:00:00.000Z] Debug Message: Business Rule Debug.',
        'debug-location',
        { data: 'foobar' },
      );
    });
  });

  describe('trace()', () => {
    it('should not log a trace level message if the logger level does not allow it.', () => {
      Reflect.set(logger, 'logLevel', LogLevel.DEBUG);
      logger.trace('Trace Message.', 'trace-location');
      expect(traceSpy).not.toHaveBeenCalled();
    });

    it('should log a trace level message.', () => {
      const message = 'Trace Message: Business Rule Trace.';

      logger.trace(message, 'trace-location', { data: 'foobar' });

      expect(traceSpy).toHaveBeenCalledWith(
        '[Trace] [2026-08-12T03:00:00.000Z] Trace Message: Business Rule Trace.',
        'trace-location',
        { data: 'foobar' },
      );
    });
  });
});
