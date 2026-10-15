import { Buffer } from 'buffer';
import { URL } from 'url';

import { DependencyInjectionContainer, getContainer, Injectable, InjectableToken } from '@guarani/di';

import { HttpRouter } from '../../http/router/http-router';
import { ConsoleLogger } from '../../logger/console/console.logger';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../tokens';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityProviderFactoryEntry } from './identity-provider-factory.entry';

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, Buffer.alloc(1), () => {}, {}, []];

const loggerEntries: IdentityProviderFactoryEntry<Logger>[] = [
  ConsoleLogger,
  () => Object.create(ConsoleLogger.prototype),
  Object.create(ConsoleLogger.prototype),
];

describe('Identity Provider Factory', () => {
  let factory: IdentityProviderFactory;
  let containerDeleteSpy: jest.SpyInstance<void, [token: InjectableToken<unknown>], any>;
  let addContainerEntrySpy: jest.SpyInstance<any, unknown[], any>;

  beforeEach(() => {
    factory = new IdentityProviderFactory();

    containerDeleteSpy = jest.spyOn(factory['container'], 'delete');
    addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);
  });

  afterEach(() => {
    factory['container'].clear();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should instantiate a new Identity Provider Factory.', () => {
      const container = getContainer(CONTAINER);

      expect(factory['container']).toBe(container);

      expect(factory['container']['registry']['bindings'].size).toEqual(3);

      expect(factory['container'].resolve(DependencyInjectionContainer)).toBe(container);
      expect(factory['container'].resolve(HttpRouter)).toBeInstanceOf(HttpRouter);
      expect(factory['container'].resolve(Logger)).toBeInstanceOf(ConsoleLogger);
    });
  });

  describe('addContainerEntry()', () => {
    it.each(invalidTokens)('should throw when the provided Token is invalid.', (token) => {
      expect(() => factory['addContainerEntry'](token, 'value')).toThrowWithMessage(
        TypeError,
        'The provided Token is invalid.',
      );
    });

    it('should throw when the provided class Entry is the provided class Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, Buffer)).toThrowWithMessage(
        TypeError,
        'The class "Buffer" does not inherit from the Token "Buffer".',
      );
    });

    it('should throw when the provided class Entry does not inherit from the provided class Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, URL)).toThrowWithMessage(
        TypeError,
        'The class "URL" does not inherit from the Token "Buffer".',
      );
    });

    it('should add the provided class Entry under the provided class Token.', () => {
      expect(() => factory['addContainerEntry'](AbstractClass, Class)).not.toThrow();
      expect(factory['container'].resolve(AbstractClass)).toBeInstanceOf(Class);
    });

    it('should add the provided factory Entry under the provided Token.', () => {
      expect(() => factory['addContainerEntry'](AbstractClass, () => new Class())).not.toThrow();
      expect(factory['container'].resolve(AbstractClass)).toBeInstanceOf(Class);
    });

    it('should throw when binding a non-class Token to itself.', () => {
      expect(() => factory['addContainerEntry']('TOKEN')).toThrowWithMessage(
        TypeError,
        'The Token "TOKEN" is not a valid class.',
      );
    });

    it('should add the provided class Entry under itself.', () => {
      expect(() => factory['addContainerEntry'](Class)).not.toThrow();
      expect(factory['container'].resolve(Class)).toBeInstanceOf(Class);
    });

    it('should throw when the provided object Entry does not inherit from the provided class Token.', () => {
      expect(() => factory['addContainerEntry'](Buffer, new URL('https://provider.example.com'))).toThrowWithMessage(
        TypeError,
        'The object "URL" does not inherit from the Token "Buffer".',
      );
    });

    it('should add the provided object Entry under the provided Token.', () => {
      const buffer = Buffer.alloc(0);
      expect(() => factory['addContainerEntry'](Buffer, buffer)).not.toThrow();
      expect(factory['container'].resolve(Buffer)).toBe(buffer);
    });
  });

  describe('addLogger()', () => {
    it.each(loggerEntries)('should add the provided Logger to the Identity Provider Factory.', (logger) => {
      expect(() => factory.addLogger(logger)).not.toThrow();
      expect(factory['container'].resolve(Logger)).toBeInstanceOf(Logger);
    });
  });

  describe('add()', () => {
    it('should add the provided Entry under the provided Token.', () => {
      expect(() => factory.add(Buffer, Buffer.alloc(0))).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Buffer);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Buffer, Buffer.alloc(0));
    });
  });
});

abstract class AbstractClass {}

@Injectable()
class Class extends AbstractClass {}
