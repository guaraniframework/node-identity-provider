import { Buffer } from 'buffer';
import { URL } from 'url';

import { DependencyInjectionContainer, getContainer, Injectable, InjectableToken } from '@guarani/di';

import { DataAccess } from '../data-access/data-access';
import { SQLiteDataAccess } from '../data-access/sqlite/sqlite.data-access';
import { Endpoint } from '../endpoints/endpoint';
import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../logger/logger';
import { IdentityProvider } from '../providers/identity-provider';
import { CONTAINER } from './container.token';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityProviderOptions } from './identity-provider.options';

@Injectable()
class TestIdentityProvider extends IdentityProvider {}

const invalidIssuers: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  '',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  'a',
];

const tokens: InjectableToken<any>[] = ['LOGGER', Symbol('LOGGER'), Logger];

const invalidLoggers: any[] = [null, true, 1, 1.2, 1n, 'a', Symbol('a'), Buffer, Buffer.alloc(1), {}, []];
const loggers: any[] = [ConsoleLogger, new ConsoleLogger(), () => new ConsoleLogger()];

const invalidDataAccesses: any[] = [null, true, 1, 1.2, 1n, 'a', Symbol('a'), Buffer, Buffer.alloc(1), {}, []];
const dataAccesses: any[] = [SQLiteDataAccess, SQLiteDataAccess.prototype, () => SQLiteDataAccess.prototype];

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, '', Buffer.alloc(1), () => 1, {}, []];

const invalidProviders: any[] = [
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  IdentityProvider,
  new IdentityProvider(new ConsoleLogger(), []),
];

describe('Identity Provider Factory', () => {
  let factory!: IdentityProviderFactory;
  const container = getContainer(CONTAINER);

  let containerDeleteSpy: jest.SpyInstance<void, [token: InjectableToken<unknown>], any>;
  let addContainerEntrySpy: jest.SpyInstance<any, unknown[], any>;

  beforeEach(() => {
    factory = new IdentityProviderFactory('http://idp.example.com');

    containerDeleteSpy = jest.spyOn(container, 'delete');
    addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it.each(invalidIssuers)('should throw when the provided Issuer is invalid.', (issuer) => {
      expect(() => new IdentityProviderFactory(issuer)).toThrowWithMessage(
        TypeError,
        'The provided Issuer URL is invalid.',
      );
    });

    it('should return an Identity Provider Factory.', () => {
      let factory!: IdentityProviderFactory;

      expect(() => (factory = new IdentityProviderFactory('http://idp.example.com'))).not.toThrow();

      expect(factory['container']).toBe(container);
      expect(factory['options']).toStrictEqual({} as IdentityProviderOptions);
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
      expect(container.isRegistered(token)).toBeTrue();
    });

    it.each(tokens)('should add the provided Factory Entry to the provided Token.', (token) => {
      expect(() => factory['addContainerEntry'](token, () => new ConsoleLogger())).not.toThrow();
      expect(container.isRegistered(token)).toBeTrue();
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
      expect(container.isRegistered(ConsoleLogger)).toBeTrue();
    });

    it('should throw when the provided Object Entry does not inherit from the provided Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, new URL('http://idp.example.com'))).toThrowWithMessage(
        TypeError,
        'The object "URL" does not inherit from the Token "Buffer".',
      );
    });

    it.each(tokens)('should add the provided Object Entry to the provided Token.', (token) => {
      expect(() => factory['addContainerEntry'](token, new ConsoleLogger())).not.toThrow();
      expect(container.isRegistered(token)).toBeTrue();
    });
  });

  describe('configure()', () => {
    it('should allow the Application to configure the Identity Provider Options.', () => {
      expect(factory['options']).toStrictEqual({} as IdentityProviderOptions);

      expect(() => factory.configure((options) => (options.issuer = new URL('https://idp.example.com')))).not.toThrow();

      expect(factory['options']).toStrictEqual({
        issuer: new URL('https://idp.example.com'),
      } as IdentityProviderOptions);
    });
  });

  describe('addLogger()', () => {
    it.each(invalidLoggers)('should throw when the provided Logger is invalid.', (logger) => {
      expect(() => factory.addLogger(logger)).toThrow();
    });

    it.each(loggers)('should add a Logger to the Identity Provider Factory.', (logger) => {
      expect(() => factory.addLogger(logger)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Logger);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Logger, logger);
    });
  });

  describe('addDataAccess()', () => {
    it.each(invalidDataAccesses)('should throw when the provided Data Access is invalid.', (dataAccess) => {
      expect(() => factory.addDataAccess(dataAccess)).toThrow();
    });

    it.each(dataAccesses)('should add a Data Access to the Identity Provider Factory.', (dataAccess) => {
      expect(() => factory.addDataAccess(dataAccess)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(DataAccess);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(DataAccess, dataAccess);
    });
  });

  describe('add()', () => {
    it.each(invalidTokens)('should throw when the provided Token is invalid.', (token) => {
      expect(() => factory.add(token, 'foo')).toThrowWithMessage(TypeError, 'The provided Token is invalid.');
    });

    it('should add the provided Token to the Identity Provider Factory.', () => {
      expect(() => factory.add(Buffer)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Buffer);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Buffer, undefined);
    });

    it.each(tokens)('should add the provided Token and Entry to the Identity Provider Factory.', (token) => {
      const logger = new ConsoleLogger();

      expect(() => factory.add(token, logger)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(token);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(token, logger);
    });
  });

  describe('create()', () => {
    it.each(invalidProviders)('should throw when the provided Identity Provider is invalid.', (provider) => {
      expect(() => factory.create(provider)).toThrowWithMessage(
        TypeError,
        'The provided Identity Provider is invalid.',
      );
    });

    it('should return an instance of the Identity Provider.', () => {
      let provider!: IdentityProvider;

      container.bind(Endpoint).toValue(Reflect.construct(Endpoint, []));

      expect(() => (provider = factory.create())).not.toThrow();

      expect(provider).toBeInstanceOf(IdentityProvider);

      expect(addContainerEntrySpy).toHaveBeenCalledWith(IdentityProvider, undefined);
      expect(addContainerEntrySpy).toHaveBeenCalledWith(DependencyInjectionContainer, container);
    });

    it('should return an instance of the provided Identity Provider.', () => {
      let provider!: IdentityProvider;

      container.bind(Endpoint).toValue(Reflect.construct(Endpoint, []));

      expect(() => (provider = factory.create(TestIdentityProvider))).not.toThrow();

      expect(provider).toBeInstanceOf(IdentityProvider);

      expect(addContainerEntrySpy).toHaveBeenCalledWith(IdentityProvider, TestIdentityProvider);
      expect(addContainerEntrySpy).toHaveBeenCalledWith(DependencyInjectionContainer, container);
    });
  });
});
