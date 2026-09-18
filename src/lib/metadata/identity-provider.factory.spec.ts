import { Buffer } from 'buffer';
import { URL } from 'url';

import { DependencyInjectionContainer, getContainer, Injectable, InjectableToken } from '@guarani/di';

import { Endpoint } from '../endpoints/endpoint';
import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../logger/logger';
import { IdentityProvider } from '../providers/identity-provider';
import { Settings } from '../settings/settings';
import { SETTINGS } from '../settings/settings.token';
import { CONTAINER } from './container.token';
import { IdentityProviderFactory } from './identity-provider.factory';

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

const invalidScopes: any[] = [
  undefined,
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
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
];

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

  beforeEach(() => {
    factory = new IdentityProviderFactory('http://idp.example.com');
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
      const settings: Settings = { issuer: new URL('http://idp.example.com'), scopes: new Set() };

      expect(() => (factory = new IdentityProviderFactory('http://idp.example.com'))).not.toThrow();

      expect(factory['settings']).toStrictEqual(settings);
      expect(factory['container']).toBe(container);

      expect(container.isRegistered(Logger)).toBeTrue();
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

  describe('addLogger()', () => {
    it.each(invalidLoggers)('should throw when the provided Logger is invalid.', (logger) => {
      expect(() => factory.addLogger(logger)).toThrow();
    });

    it.each(loggers)('should add a Logger to the Identity Provider Factory.', (logger) => {
      const containerDeleteSpy = jest.spyOn(container, 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      expect(() => factory.addLogger(logger)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Logger);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Logger, logger);
    });
  });

  describe('addScopes()', () => {
    it.each(invalidScopes)('should throw when the provided Scopes is invalid.', (scopes) => {
      expect(() => factory.addScopes(scopes)).toThrowWithMessage(TypeError, 'The provided Scopes is invalid.');
    });

    it('should add the provided Scopes to the Identity Provider Factory.', () => {
      expect(() => factory.addScopes(['foo', 'bar', 'baz'])).not.toThrow();
      expect(factory['settings'].scopes).toStrictEqual(new Set(['foo', 'bar', 'baz']));
    });
  });

  describe('add()', () => {
    it.each(invalidTokens)('should throw when the provided Token is invalid.', (token) => {
      expect(() => factory.add(token, 'foo')).toThrowWithMessage(TypeError, 'The provided Token is invalid.');
    });

    it('should add the provided Token to the Identity Provider Factory.', () => {
      const containerDeleteSpy = jest.spyOn(container, 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      expect(() => factory.add(Buffer)).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Buffer);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Buffer, undefined);
    });

    it.each(tokens)('should add the provided Token and Entry to the Identity Provider Factory.', (token) => {
      const containerDeleteSpy = jest.spyOn(container, 'delete');
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

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
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      container.bind(Endpoint).toValue(Reflect.construct(Endpoint, []));

      expect(() => (provider = factory.create())).not.toThrow();

      expect(provider).toBeInstanceOf(IdentityProvider);

      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(1, SETTINGS, factory['settings']);
      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(2, IdentityProvider, undefined);
      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(3, DependencyInjectionContainer, container);
    });

    it('should return an instance of the provided Identity Provider.', () => {
      let provider!: IdentityProvider;
      const addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);

      container.bind(Endpoint).toValue(Reflect.construct(Endpoint, []));

      expect(() => (provider = factory.create(TestIdentityProvider))).not.toThrow();

      expect(provider).toBeInstanceOf(IdentityProvider);

      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(1, SETTINGS, factory['settings']);
      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(2, IdentityProvider, TestIdentityProvider);
      expect(addContainerEntrySpy).toHaveBeenNthCalledWith(3, DependencyInjectionContainer, container);
    });
  });
});
