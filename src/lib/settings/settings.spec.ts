import { Buffer } from 'buffer';
import { URL } from 'url';

import { DEFAULT_MINIMUM_MAX_AGE, DEFAULT_SESSION_COOKIE } from '../constants';
import { Settings } from './settings';
import { SettingsParameters } from './settings.parameters';

const invalidParameters: any[] = [
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
  () => {},
  [],
];

const invalidIssuers: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

const invalidSecretKeys: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
];

const invalidIdTokenSignatureAlgorithms: any[] = [
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
  () => {},
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
  [() => {}],
  [{}],
  [[]],
  ['none'],
  [''],
  ['RSA-OAEP'],
];

const invalidIdTokenKeyWrapAlgorithms: any[] = [
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
  () => {},
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
  [() => {}],
  [{}],
  [[]],
  [''],
  ['A128GCM'],
];

const invalidIdTokenContentEncryptionAlgorithms: any[] = [
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
  () => {},
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
  [() => {}],
  [{}],
  [[]],
  [''],
  ['ES256'],
];

const invalidUiLocales: any[] = [
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
  () => {},
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
  [() => {}],
  [{}],
  [[]],
  [''],
];

const invalidAcrValues: any[] = [
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
  () => {},
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
  [() => {}],
  [{}],
  [[]],
  [''],
];

const invalidMinimumMaxAges: any[] = [
  undefined,
  null,
  true,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  1.1,
  0,
  -1,
];

const invalidSessionCookies: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
];

describe('Settings', () => {
  describe('constructor', () => {
    let parameters: SettingsParameters;

    beforeEach(() => {
      parameters = {
        issuer: 'https://provider.example.com',
        secretKey: 'secret_key',
        idTokenSignatureAlgorithms: ['ES256'],
        idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
        idTokenContentEncryptionAlgorithms: ['A128GCM'],
        uiLocales: ['en-US'],
        acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
        minimumMaxAge: 86400,
        sessionCookie: '_session',
      };
    });

    it.each(invalidParameters)('should throw when the provided Settings Parameters is invalid.', (parameters) => {
      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'The provided Settings Parameters is invalid.',
      );
    });

    it.each(invalidIssuers)('should throw when the provided Issuer URL is invalid.', (issuer) => {
      expect(() => new Settings({ ...parameters, issuer })).toThrowWithMessage(
        TypeError,
        'The provided Issuer URL is invalid.',
      );
    });

    it.each(invalidSecretKeys)('should throw when the provided Secret Key is invalid.', (secretKey) => {
      expect(() => new Settings({ ...parameters, secretKey })).toThrowWithMessage(
        TypeError,
        'The provided Secret Key is invalid.',
      );
    });

    it.each(invalidIdTokenSignatureAlgorithms)(
      'should throw when the provided ID Token Signature Algorithms is invalid.',
      (idTokenSignatureAlgorithms) => {
        expect(() => new Settings({ ...parameters, idTokenSignatureAlgorithms })).toThrowWithMessage(
          TypeError,
          'The provided ID Token Signature Algorithms is invalid.',
        );
      },
    );

    it.each(invalidIdTokenKeyWrapAlgorithms)(
      'should throw when the provided ID Token Key Wrap Algorithms is invalid.',
      (idTokenKeyWrapAlgorithms) => {
        expect(() => new Settings({ ...parameters, idTokenKeyWrapAlgorithms })).toThrowWithMessage(
          TypeError,
          'The provided ID Token Key Wrap Algorithms is invalid.',
        );
      },
    );

    it.each(invalidIdTokenContentEncryptionAlgorithms)(
      'should throw when the provided ID Token Content Encryption Algorithms is invalid.',
      (idTokenContentEncryptionAlgorithms) => {
        expect(() => new Settings({ ...parameters, idTokenContentEncryptionAlgorithms })).toThrowWithMessage(
          TypeError,
          'The provided ID Token Content Encryption Algorithms is invalid.',
        );
      },
    );

    it.each(invalidUiLocales)('should throw when the provided UI Locales is invalid.', (uiLocales) => {
      expect(() => new Settings({ ...parameters, uiLocales })).toThrowWithMessage(
        TypeError,
        'The provided UI Locales is invalid.',
      );
    });

    it.each(invalidAcrValues)(
      'should throw when the provided Authentication Context Class References is invalid.',
      (acrValues) => {
        expect(() => new Settings({ ...parameters, acrValues })).toThrowWithMessage(
          TypeError,
          'The provided Authentication Context Class References is invalid.',
        );
      },
    );

    it.each(invalidMinimumMaxAges)('should throw when the provided Minimum Max Age is invalid.', (minimumMaxAge) => {
      expect(() => new Settings({ ...parameters, minimumMaxAge })).toThrowWithMessage(
        TypeError,
        'The provided Minimum Max Age is invalid.',
      );
    });

    it.each(invalidSessionCookies)('should throw when the provided Session Cookie is invalid.', (sessionCookie) => {
      expect(() => new Settings({ ...parameters, sessionCookie })).toThrowWithMessage(
        TypeError,
        'The provided Session Cookie is invalid.',
      );
    });

    it('should throw when not providing an ID Token Signature Algorithm and providing an ID Token Key Wrap Algorithm.', () => {
      Reflect.deleteProperty(parameters, 'idTokenSignatureAlgorithms');
      Reflect.deleteProperty(parameters, 'idTokenContentEncryptionAlgorithms');

      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'Missing required ID Token Signature Algorithms when using ID Token Encryption.',
      );
    });

    it('should throw when not providing an ID Token Signature Algorithm and providing an ID Token Content Encryption Algorithm.', () => {
      Reflect.deleteProperty(parameters, 'idTokenSignatureAlgorithms');
      Reflect.deleteProperty(parameters, 'idTokenKeyWrapAlgorithms');

      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'Missing required ID Token Signature Algorithms when using ID Token Encryption.',
      );
    });

    it('should throw when not providing an ID Token Key Wrap Algorithm and providing an ID Token Content Encryption Algorithm.', () => {
      Reflect.deleteProperty(parameters, 'idTokenKeyWrapAlgorithms');

      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'Missing required ID Token Key Wrap Algorithms when using ID Token Encryption.',
      );
    });

    it('should throw when not providing an ID Token Content Encryption Algorithm and providing an ID Token Key Wrap Algorithm.', () => {
      Reflect.deleteProperty(parameters, 'idTokenContentEncryptionAlgorithms');

      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'Missing required ID Token Content Encryption Algorithms when using ID Token Encryption.',
      );
    });

    it('should instantiate a new Settings with the provided values.', () => {
      let settings!: Settings;

      expect(() => (settings = new Settings(parameters))).not.toThrow();

      expect(settings).toBeInstanceOf(Settings);

      expect(settings).toStrictEqual<Partial<Settings>>(
        expect.objectContaining<Partial<Settings>>({
          issuer: new URL('https://provider.example.com'),
          secretKey: 'secret_key',
          idTokenSignatureAlgorithms: ['ES256'],
          idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
          idTokenContentEncryptionAlgorithms: ['A128GCM'],
          uiLocales: ['en-US'],
          acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
          minimumMaxAge: 86400,
          sessionCookie: '_session',
        }),
      );
    });

    it('should instantiate a new Settings with the default values.', () => {
      let settings!: Settings;

      expect(() => {
        settings = new Settings({ issuer: 'https://provider.example.com', secretKey: 'secret_key' });
      }).not.toThrow();

      expect(settings).toBeInstanceOf(Settings);

      expect(settings).toStrictEqual<Partial<Settings>>(
        expect.objectContaining<Partial<Settings>>({
          issuer: new URL('https://provider.example.com'),
          secretKey: 'secret_key',
          idTokenSignatureAlgorithms: [],
          idTokenKeyWrapAlgorithms: [],
          idTokenContentEncryptionAlgorithms: [],
          uiLocales: [],
          acrValues: [],
          minimumMaxAge: DEFAULT_MINIMUM_MAX_AGE,
          sessionCookie: DEFAULT_SESSION_COOKIE,
        }),
      );
    });
  });
});
