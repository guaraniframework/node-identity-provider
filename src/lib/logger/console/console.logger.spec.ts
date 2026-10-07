import { LogLevel } from '../log-level.enum';
import { ConsoleLogger } from './console.logger';

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

  describe('log()', () => {
    it('should log a critical level message.', () => {
      const message = 'Critical Error Message: Broken System.';
      const error = new Error('Critical Error.');

      logger['log'](LogLevel.CRITICAL, message, 'critical-error-location', { data: 'foobar' }, error);

      expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
        '[Critical] [2026-08-12T03:00:00.000Z] Critical Error Message: Broken System.',
        'critical-error-location',
        { data: 'foobar' },
        error,
      );
    });

    it('should log an error level message.', () => {
      const message = 'Error Message: Business Rule Error.';
      const error = new Error('Error.');

      logger['log'](LogLevel.ERROR, message, 'error-location', { data: 'foobar' }, error);

      expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
        '[Error] [2026-08-12T03:00:00.000Z] Error Message: Business Rule Error.',
        'error-location',
        { data: 'foobar' },
        error,
      );
    });

    it('should log a warning level message.', () => {
      const message = 'Warning Message: Business Rule Warning.';
      const error = new Error('Warning.');

      logger['log'](LogLevel.WARNING, message, 'warning-location', { data: 'foobar' }, error);

      expect(warnSpy).toHaveBeenCalledWith(
        '[Warning] [2026-08-12T03:00:00.000Z] Warning Message: Business Rule Warning.',
        'warning-location',
        { data: 'foobar' },
        error,
      );
    });

    it('should log an information level message.', () => {
      const message = 'Information Message: Business Rule Information.';

      logger['log'](LogLevel.INFORMATION, message, 'information-location', { data: 'foobar' });

      expect(infoSpy).toHaveBeenCalledWith(
        '[Information] [2026-08-12T03:00:00.000Z] Information Message: Business Rule Information.',
        'information-location',
        { data: 'foobar' },
      );
    });

    it('should log a debug level message.', () => {
      const message = 'Debug Message: Business Rule Debug.';

      logger['log'](LogLevel.DEBUG, message, 'debug-location', { data: 'foobar' });

      expect(debugSpy).toHaveBeenCalledWith(
        '[Debug] [2026-08-12T03:00:00.000Z] Debug Message: Business Rule Debug.',
        'debug-location',
        { data: 'foobar' },
      );
    });

    it('should log a trace level message.', () => {
      const message = 'Trace Message: Business Rule Trace.';

      logger['log'](LogLevel.TRACE, message, 'trace-location', { data: 'foobar' });

      expect(traceSpy).toHaveBeenCalledWith(
        '[Trace] [2026-08-12T03:00:00.000Z] Trace Message: Business Rule Trace.',
        'trace-location',
        { data: 'foobar' },
      );
    });
  });
});
