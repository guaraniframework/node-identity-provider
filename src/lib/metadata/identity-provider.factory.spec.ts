import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer, InjectableToken } from '@guarani/di';

import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../logger/logger';
import { CONTAINER } from './container.token';
import { IdentityProviderFactory } from './identity-provider.factory';

const tokens: InjectableToken<any>[] = ['LOGGER', Symbol('LOGGER'), Logger];

const invalidLoggers: any[] = [null, true, 1, 1.2, 1n, 'a', Symbol('a'), Buffer, Buffer.alloc(1), {}, []];
const loggers: any[] = [ConsoleLogger, new ConsoleLogger(), () => new ConsoleLogger()];

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, '', Buffer.alloc(1), () => 1, {}, []];

describe('Identity Provider Factory', () => {
  let factory!: IdentityProviderFactory;

  beforeEach(() => {
    factory = new IdentityProviderFactory();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should return an Identity Provider Factory.', () => {
      let factory!: IdentityProviderFactory;

      expect(() => (factory = new IdentityProviderFactory())).not.toThrow();

      expect(factory['container']).toBe(getContainer(CONTAINER));
      expect(factory['container'].isRegistered(Logger)).toBeTrue();
    });
  });

  describe('addContainerEntry()', () => {
    it('should throw when the provided Class Entry does not inherit from the provided Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, URL)).toThrowWithMessage(
        TypeError,
        'The class "URL" does not inherit from the Token "Buffer".',
      );
    });

    it.each(tokens)('should add the provided Class Entry to the provided Token.', (token) => {
      expect(() => factory['addContainerEntry'](token, ConsoleLogger)).not.toThrow();
      expect(factory['container'].isRegistered(token)).toBeTrue();
    });

    it.each(tokens)('should add the provided Factory Entry to the provided Token.', (token) => {
      expect(() => factory['addContainerEntry'](token, () => new ConsoleLogger())).not.toThrow();
      expect(factory['container'].isRegistered(token)).toBeTrue();
    });

    it.each(tokens.slice(0, -1))(
      'should throw when the provided Token is not a valid class for an empty Entry.',
      (token) => {
        expect(() => factory['addContainerEntry'](token)).toThrowWithMessage(
          TypeError,
          'The provided Token is not a valid class.',
        );
      },
    );

    it('should add the provided Token to itself.', () => {
      expect(() => factory['addContainerEntry'](ConsoleLogger)).not.toThrow();
      expect(factory['container'].isRegistered(ConsoleLogger)).toBeTrue();
    });

    it('should throw when the provided Object Entry does not inherit from the provided Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, new URL('http://idp.example.com'))).toThrowWithMessage(
        TypeError,
        'The object "URL" does not inherit from the Token "Buffer".',
      );
    });

    it.each(tokens)('should add the provided Object Entry to the provided Token.', (token) => {
      expect(() => factory['addContainerEntry'](token, new ConsoleLogger())).not.toThrow();
      expect(factory['container'].isRegistered(token)).toBeTrue();
    });
  });

  describe('addLogger()', () => {
    it.each(invalidLoggers)('should throw when the provided Logger is invalid.', (logger) => {
      expect(() => factory.addLogger(logger)).toThrow();
    });

    it.each(loggers)('should add a Logger to the Identity Provider Factory.', (logger) => {
      const containerDeleteSpy = jest.spyOn(factory['container'], 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      expect(() => factory.addLogger(logger)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Logger);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Logger, logger);
    });
  });

  describe('add()', () => {
    it.each(invalidTokens)('should throw when the provided Token is invalid.', (token) => {
      expect(() => factory.add(token, 'foo')).toThrowWithMessage(TypeError, 'The provided Token is invalid.');
    });

    it('should add the provided Token to the Identity Provider Factory.', () => {
      const containerDeleteSpy = jest.spyOn(factory['container'], 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      expect(() => factory.add(Buffer)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Buffer);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Buffer, undefined);
    });

    it.each(tokens)('should add the provided Token and Entry to the Identity Provider Factory.', (token) => {
      const containerDeleteSpy = jest.spyOn(factory['container'], 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      const logger = new ConsoleLogger();

      expect(() => factory.add(token, logger)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(token);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(token, logger);
    });
  });
});
