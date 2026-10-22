import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { LoggerLevel } from '../logger-level.enum';
import { ConsoleLogger } from './console.logger';

describe('Console Logger', () => {
  let logger: ConsoleLogger;
  const container = getContainer(CONTAINER);

  let consoleSpies: NodeJS.Dict<jest.SpyInstance<void, any[], any>>;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));

    global.console.debug = jest.fn();
    global.console.error = jest.fn();
    global.console.info = jest.fn();
    global.console.trace = jest.fn();
    global.console.warn = jest.fn();
  });

  beforeEach(() => {
    consoleSpies = {
      debug: jest.spyOn(global.console, 'debug'),
      error: jest.spyOn(global.console, 'error'),
      info: jest.spyOn(global.console, 'info'),
      trace: jest.spyOn(global.console, 'trace'),
      warn: jest.spyOn(global.console, 'warn'),
    };

    container.bind(ConsoleLogger).toSelf().asSingleton();

    logger = container.resolve(ConsoleLogger);
  });

  afterEach(() => {
    container.clear();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should instantiate a new Console Logger with the default Logger Level.', () => {
      let logger!: ConsoleLogger;

      expect(() => (logger = new ConsoleLogger())).not.toThrow();

      expect(logger['loggerLevel']).toBe(LoggerLevel.TRACE);

      expect(consoleSpies['warn']).toHaveBeenCalledWith(
        '[Warn] [2026-08-12T00:00:00.000Z] [ConsoleLogger] Using the default Console Logger. This is only recommended for development environments.',
        'bd41fa1d-c43f-4e08-be2e-bbb5f6877dc5',
        null,
        undefined,
      );
    });

    it('should instantiate a new Console Logger with the provided Logger Level.', () => {
      let logger!: ConsoleLogger;

      expect(() => (logger = new ConsoleLogger(LoggerLevel.WARN))).not.toThrow();

      expect(logger['loggerLevel']).toBe(LoggerLevel.WARN);

      expect(consoleSpies['warn']).toHaveBeenCalledWith(
        '[Warn] [2026-08-12T00:00:00.000Z] [ConsoleLogger] Using the default Console Logger. This is only recommended for development environments.',
        'bd41fa1d-c43f-4e08-be2e-bbb5f6877dc5',
        null,
        undefined,
      );
    });
  });

  describe('log()', () => {
    it('should log a fatal level message.', () => {
      const message = 'Fatal Error Message: Broken System.';
      const error = new Error('Fatal Error.');

      logger['log'](LoggerLevel.FATAL, message, 'fatal-error-location', { data: 'foobar' }, error, 'parameter');

      expect(consoleSpies['error']).toHaveBeenCalledWith(
        '[Fatal] [2026-08-12T00:00:00.000Z] Fatal Error Message: Broken System.',
        'fatal-error-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });

    it('should log an error level message.', () => {
      const message = 'Error Message: Business Rule Error.';
      const error = new Error('Error.');

      logger['log'](LoggerLevel.ERROR, message, 'error-location', { data: 'foobar' }, error, 'parameter');

      expect(consoleSpies['error']).toHaveBeenCalledWith(
        '[Error] [2026-08-12T00:00:00.000Z] Error Message: Business Rule Error.',
        'error-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });

    it('should log a warn level message.', () => {
      const message = 'Warn Message: Business Rule Warn.';
      const error = new Error('Warn.');

      logger['log'](LoggerLevel.WARN, message, 'warn-location', { data: 'foobar' }, error, 'parameter');

      expect(consoleSpies['warn']).toHaveBeenCalledWith(
        '[Warn] [2026-08-12T00:00:00.000Z] Warn Message: Business Rule Warn.',
        'warn-location',
        { data: 'foobar' },
        error,
        'parameter',
      );
    });

    it('should log an info level message.', () => {
      const message = 'Info Message: Business Rule Info.';

      logger['log'](LoggerLevel.INFO, message, 'info-location', { data: 'foobar' }, 'parameter');

      expect(consoleSpies['info']).toHaveBeenCalledWith(
        '[Info] [2026-08-12T00:00:00.000Z] Info Message: Business Rule Info.',
        'info-location',
        { data: 'foobar' },
        'parameter',
      );
    });

    it('should log a debug level message.', () => {
      const message = 'Debug Message: Business Rule Debug.';

      logger['log'](LoggerLevel.DEBUG, message, 'debug-location', { data: 'foobar' }, 'parameter');

      expect(consoleSpies['debug']).toHaveBeenCalledWith(
        '[Debug] [2026-08-12T00:00:00.000Z] Debug Message: Business Rule Debug.',
        'debug-location',
        { data: 'foobar' },
        'parameter',
      );
    });

    it('should log a trace level message.', () => {
      const message = 'Trace Message: Business Rule Trace.';

      logger['log'](LoggerLevel.TRACE, message, 'trace-location', { data: 'foobar' }, 'parameter');

      expect(consoleSpies['trace']).toHaveBeenCalledWith(
        '[Trace] [2026-08-12T00:00:00.000Z] Trace Message: Business Rule Trace.',
        'trace-location',
        { data: 'foobar' },
        'parameter',
      );
    });
  });
});
