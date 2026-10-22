import { Buffer } from 'buffer';
import { URL } from 'url';

import { DependencyInjectionContainer, Factory, getContainer, Injectable } from '@guarani/di';

import { CONTAINER } from '../constants';
import { Endpoint } from '../endpoints/endpoint';
import { NodeIdentityProvider } from '../http/providers/node/node.identity-provider';
import { ConsoleLogger } from '../loggers/console/console.logger';
import { Logger } from '../loggers/logger';
import { Settings } from '../settings/settings';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityProviderFactoryEntry } from './identity-provider-factory.entry';

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, Buffer.alloc(1), () => {}, {}, []];

const loggerEntries: IdentityProviderFactoryEntry<Logger>[] = [
  ConsoleLogger,
  () => Object.create(ConsoleLogger.prototype),
  Object.create(ConsoleLogger.prototype),
];

const settingsEntries: (Settings | Factory<Settings>)[] = [
  () => Object.create(Settings.prototype),
  Object.create(Settings.prototype),
];

describe('Identity Provider Factory', () => {
  let factory: IdentityProviderFactory;
  const container = getContainer(CONTAINER);

  let containerDeleteSpy: jest.SpyInstance;
  let addContainerEntrySpy: jest.SpyInstance;

  beforeAll(() => {
    global.console.debug = jest.fn();
    global.console.error = jest.fn();
    global.console.info = jest.fn();
    global.console.trace = jest.fn();
    global.console.warn = jest.fn();
  });

  beforeEach(() => {
    factory = new IdentityProviderFactory();

    containerDeleteSpy = jest.spyOn(container, 'delete');
    addContainerEntrySpy = jest.spyOn(factory, 'addContainerEntry' as any);
  });

  afterEach(() => {
    container.clear();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should instantiate a new Identity Provider Factory.', () => {
      const container = getContainer(CONTAINER);

      expect(factory['container']).toBe(container);

      expect(container['registry']['bindings'].size).toBe(2);

      expect(container.resolve(DependencyInjectionContainer)).toBe(container);
      expect(container.resolve(Logger)).toBeInstanceOf(ConsoleLogger);
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
      expect(container.resolve(AbstractClass)).toBeInstanceOf(Class);
    });

    it('should add the provided factory Entry under the provided Token.', () => {
      expect(() => factory['addContainerEntry'](AbstractClass, () => new Class())).not.toThrow();
      expect(container.resolve(AbstractClass)).toBeInstanceOf(Class);
    });

    it('should throw when binding a non-class Token to itself.', () => {
      expect(() => factory['addContainerEntry']('TOKEN')).toThrowWithMessage(
        TypeError,
        'The Token "TOKEN" is not a valid class.',
      );
    });

    it('should add the provided class Entry under itself.', () => {
      expect(() => factory['addContainerEntry'](Class)).not.toThrow();
      expect(container.resolve(Class)).toBeInstanceOf(Class);
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
      expect(container.resolve(Buffer)).toBe(buffer);
    });
  });

  describe('addLogger()', () => {
    it.each(loggerEntries)('should add the provided Logger to the Identity Provider Factory.', (logger) => {
      expect(() => factory.addLogger(logger)).not.toThrow();
      expect(factory['container'].resolve(Logger)).toBeInstanceOf(Logger);
    });
  });

  describe('addSettings()', () => {
    it('should throw when the provided Settings Entry is the Settings constructor.', () => {
      expect(() => factory.addSettings(Settings as any)).toThrowWithMessage(
        TypeError,
        'The Settings Entry must be an object or a factory.',
      );
    });

    it.each(settingsEntries)('should add the provided Settings to the Identity Provider Factory.', (settings) => {
      expect(() => factory.addSettings(settings)).not.toThrow();
      expect(factory['container'].resolve(Settings)).toBeInstanceOf(Settings);
    });
  });

  describe('add()', () => {
    it('should add the provided Entry under the provided Token.', () => {
      expect(() => factory.add(Buffer, Buffer.alloc(0))).not.toThrow();

      expect(containerDeleteSpy).toHaveBeenCalledExactlyOnceWith(Buffer);
      expect(addContainerEntrySpy).toHaveBeenCalledExactlyOnceWith(Buffer, Buffer.alloc(0));
    });
  });

  describe('create()', () => {
    it('should return an instance of the provided Identity Provider.', () => {
      factory.addSettings(Object.create(Settings.prototype)).add(Endpoint, Object.create(Endpoint.prototype));
      expect(() => factory.create(NodeIdentityProvider)).not.toThrow();
    });
  });
});

abstract class AbstractClass {}

@Injectable()
class Class extends AbstractClass {}
