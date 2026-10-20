import { Buffer } from 'buffer';
import { URL } from 'url';

import { DependencyInjectionContainer, getContainer, Injectable } from '@guarani/di';

import { CONTAINER } from '../constants';
import { IdentityProviderFactory } from './identity-provider.factory';

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, Buffer.alloc(1), () => {}, {}, []];

describe('Identity Provider Factory', () => {
  let factory: IdentityProviderFactory;
  const container = getContainer(CONTAINER);

  let containerDeleteSpy: jest.SpyInstance;
  let addContainerEntrySpy: jest.SpyInstance;

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
      expect(container['registry']['bindings'].size).toEqual(1);
      expect(container.resolve(DependencyInjectionContainer)).toBe(container);
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
