import { Buffer } from 'buffer';
import { DatabaseSync } from 'node:sqlite';
import { URL } from 'url';

import { DependencyInjectionContainer, Factory, getContainer, Injectable } from '@guarani/di';
import { JsonWebKeySet } from '@guarani/jose';

import { CONTAINER } from '../constants';
import { DataAccess } from '../data-access/data-access';
import { SQLiteDataAccess } from '../data-access/sqlite/sqlite.data-access';
import { AuthorizationEndpoint } from '../endpoints/authorization/authorization.endpoint';
import { Endpoint } from '../endpoints/endpoint';
import { InteractionEndpoint } from '../endpoints/interaction/interaction.endpoint';
import { TokenEndpoint } from '../endpoints/token/token.endpoint';
import { ClientAuthenticationHandler } from '../handlers/client-authentication/client-authentication.handler';
import { IdTokenHandler } from '../handlers/id-token/id-token.handler';
import { ScopeHandler } from '../handlers/scope/scope.handler';
import { IdentityProvider } from '../http/providers/identity-provider';
import { NodeIdentityProvider } from '../http/providers/node/node.identity-provider';
import { ConsoleLogger } from '../loggers/console/console.logger';
import { Logger } from '../loggers/logger';
import { PKCE } from '../pkces/pkce';
import { Settings } from '../settings/settings';
import { PublicSubjectType } from '../subject-types/public/public.subject-type';
import { SubjectType } from '../subject-types/subject-type';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityProviderFactoryEntry } from './identity-provider-factory.entry';

const invalidTokens: any[] = [undefined, null, true, 1, 1.2, 1n, Buffer.alloc(1), () => {}, {}, []];

const invalidSubjectTypes: any[] = [
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
  [''],
  ['a'],
];

const dataAccessEntries: IdentityProviderFactoryEntry<DataAccess>[] = [
  SQLiteDataAccess,
  () => Object.create(SQLiteDataAccess.prototype),
  Object.create(SQLiteDataAccess.prototype),
];

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

      container.bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      container.bind(DatabaseSync).toValue(DatabaseSync.prototype);

      expect(factory['container']).toBe(container);

      expect(container['registry']['bindings'].size).toBe(7);

      expect(container.resolve(DependencyInjectionContainer)).toBe(container);
      expect(container.resolve(ClientAuthenticationHandler)).toBeInstanceOf(ClientAuthenticationHandler);
      expect(container.resolve(ScopeHandler)).toBeInstanceOf(ScopeHandler);
      expect(container.resolve(DataAccess)).toBeInstanceOf(SQLiteDataAccess);
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

  describe('addAuthorizationEndpoint()', () => {
    it('should add the Authorization Endpoint with the default options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);

      expect(() => factory.addAuthorizationEndpoint()).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(AuthorizationEndpoint);
    });

    it('should add the Authorization Endpoint with the provided options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);

      expect(() => factory.addAuthorizationEndpoint((options) => options.build())).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(AuthorizationEndpoint);
    });
  });

  describe('addDataAccess()', () => {
    it.each(dataAccessEntries)(
      'should add the provided Data Access to the Identity Provider Factory.',
      (dataAccess) => {
        factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
        factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);

        expect(() => factory.addDataAccess(dataAccess)).not.toThrow();
        expect(factory['container'].resolve(DataAccess)).toBeInstanceOf(DataAccess);
      },
    );
  });

  describe('addInteractionEndpoint()', () => {
    it('should add the Interaction Endpoint with the default options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);
      factory['container'].bind(SubjectType).toValue(SubjectType.prototype);

      expect(() => factory.addInteractionEndpoint()).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(InteractionEndpoint);
    });

    it('should add the Interaction Endpoint with the provided options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);
      factory['container'].bind(SubjectType).toValue(SubjectType.prototype);

      expect(() => factory.addInteractionEndpoint((options) => options.build())).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(InteractionEndpoint);
    });
  });

  describe('addTokenEndpoint()', () => {
    it('should add the Token Endpoint with the default options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);
      factory['container'].bind(PKCE).toValue(PKCE.prototype);

      expect(() => factory.addTokenEndpoint()).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(TokenEndpoint);
    });

    it('should add the Token Endpoint with the provided options to the Identity Provider Factory.', () => {
      factory['container'].bind(Settings).toValue(Settings.prototype);
      factory['container'].bind(JsonWebKeySet).toValue(JsonWebKeySet.prototype);
      factory['container'].bind(DatabaseSync).toValue(DatabaseSync.prototype);
      factory['container'].bind(PKCE).toValue(PKCE.prototype);

      expect(() => factory.addTokenEndpoint((options) => options.build())).not.toThrow();
      expect(factory['container'].resolve(Endpoint)).toBeInstanceOf(TokenEndpoint);
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

  describe('addSubjectTypes()', () => {
    it.each(invalidSubjectTypes)('should throw when the provided Subject Types is invalid.', (subjectTypes) => {
      expect(() => factory.addSubjectTypes(subjectTypes)).toThrowWithMessage(
        TypeError,
        'The provided Subject Types is invalid.',
      );
    });

    it('should add the provided Subject Types to the Identity Provider Factory.', () => {
      expect(() => factory.addSubjectTypes(['public'])).not.toThrow();

      expect(factory['container'].resolveAll(SubjectType)).toStrictEqual<SubjectType[]>([
        expect.any(PublicSubjectType),
      ]);
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
    it('should throw when missing a required Endpoint.', () => {
      factory
        .addInteractionEndpoint()
        .add(DatabaseSync, Object.create(DatabaseSync.prototype))
        .add(JsonWebKeySet, Object.create(JsonWebKeySet.prototype));

      expect(() => factory.create(NodeIdentityProvider)).toThrowWithMessage(
        TypeError,
        'Missing required Endpoint "AuthorizationEndpoint".',
      );
    });

    it('should return an instance of the provided Identity Provider.', () => {
      let provider!: IdentityProvider;

      const settings: Settings = Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
        idTokenSignatureAlgorithms: [],
        idTokenKeyWrapAlgorithms: [],
        idTokenContentEncryptionAlgorithms: [],
      });

      factory
        .addAuthorizationEndpoint()
        .addInteractionEndpoint()
        .addTokenEndpoint()
        .addSettings(settings)
        .add(DatabaseSync, Object.create(DatabaseSync.prototype))
        .add(JsonWebKeySet, Object.create(JsonWebKeySet.prototype));

      expect(() => (provider = factory.create(NodeIdentityProvider))).not.toThrow();

      expect(factory['container'].has(IdTokenHandler)).toBeFalse();

      expect(provider['endpoints']).toStrictEqual<Endpoint[]>([
        expect.any(AuthorizationEndpoint),
        expect.any(InteractionEndpoint),
        expect.any(TokenEndpoint),
      ]);
    });

    it('should return an instance of the provided Identity Provider with ID Token support.', () => {
      let provider!: IdentityProvider;

      const settings: Settings = Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
        idTokenSignatureAlgorithms: ['ES256'],
        idTokenKeyWrapAlgorithms: [],
        idTokenContentEncryptionAlgorithms: [],
      });

      factory
        .addAuthorizationEndpoint()
        .addInteractionEndpoint()
        .addTokenEndpoint()
        .addSettings(settings)
        .addSubjectTypes(['public'])
        .add(DatabaseSync, Object.create(DatabaseSync.prototype))
        .add(JsonWebKeySet, Object.create(JsonWebKeySet.prototype));

      expect(() => (provider = factory.create(NodeIdentityProvider))).not.toThrow();

      expect(factory['container'].has(IdTokenHandler)).toBeTrue();

      expect(provider['endpoints']).toStrictEqual<Endpoint[]>([
        expect.any(AuthorizationEndpoint),
        expect.any(InteractionEndpoint),
        expect.any(TokenEndpoint),
      ]);
    });
  });
});

abstract class AbstractClass {}

@Injectable()
class Class extends AbstractClass {}
