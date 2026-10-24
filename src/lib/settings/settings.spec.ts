import { Buffer } from 'buffer';
import { URL } from 'url';

import { DEFAULT_MINIMUM_MAX_AGE, DEFAULT_SESSION_COOKIE } from '../constants';
import { Settings } from './settings';

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
    it.each(invalidParameters)('should throw when the provided Settings Parameters is invalid.', (parameters) => {
      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'The provided Settings Parameters is invalid.',
      );
    });

    it.each(invalidIssuers)('should throw when the provided Issuer URL is invalid.', (issuer) => {
      // @ts-expect-error
      expect(() => new Settings({ issuer })).toThrowWithMessage(TypeError, 'The provided Issuer URL is invalid.');
    });

    it.each(invalidSecretKeys)('should throw when the provided Secret Key is invalid.', (secretKey) => {
      expect(() => {
        return new Settings({ issuer: 'https://provider.example.com', secretKey });
      }).toThrowWithMessage(TypeError, 'The provided Secret Key is invalid.');
    });

    it.each(invalidUiLocales)('should throw when the provided UI Locales is invalid.', (uiLocales) => {
      expect(() => {
        return new Settings({ issuer: 'https://provider.example.com', secretKey: 'secret_key', uiLocales });
      }).toThrowWithMessage(TypeError, 'The provided UI Locales is invalid.');
    });

    it.each(invalidAcrValues)(
      'should throw when the provided Authentication Context Class References is invalid.',
      (acrValues) => {
        expect(() => {
          return new Settings({ issuer: 'https://provider.example.com', secretKey: 'secret_key', acrValues });
        }).toThrowWithMessage(TypeError, 'The provided Authentication Context Class References is invalid.');
      },
    );

    it.each(invalidMinimumMaxAges)('should throw when the provided Minimum Max Age is invalid.', (minimumMaxAge) => {
      expect(() => {
        return new Settings({ issuer: 'https://provider.example.com', secretKey: 'secret_key', minimumMaxAge });
      }).toThrowWithMessage(TypeError, 'The provided Minimum Max Age is invalid.');
    });

    it.each(invalidSessionCookies)('should throw when the provided Session Cookie is invalid.', (sessionCookie) => {
      expect(() => {
        return new Settings({ issuer: 'https://provider.example.com', secretKey: 'secret_key', sessionCookie });
      }).toThrowWithMessage(TypeError, 'The provided Session Cookie is invalid.');
    });

    it('should instantiate a new Settings with the provided values.', () => {
      let settings!: Settings;

      expect(() => {
        settings = new Settings({
          issuer: 'https://provider.example.com',
          secretKey: 'secret_key',
          uiLocales: ['en-US'],
          acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
          minimumMaxAge: 86400,
          sessionCookie: '_session',
        });
      }).not.toThrow();

      expect(settings).toBeInstanceOf(Settings);

      expect(settings).toStrictEqual<Partial<Settings>>(
        expect.objectContaining<Partial<Settings>>({
          issuer: new URL('https://provider.example.com'),
          secretKey: 'secret_key',
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
          uiLocales: [],
          acrValues: [],
          minimumMaxAge: DEFAULT_MINIMUM_MAX_AGE,
          sessionCookie: DEFAULT_SESSION_COOKIE,
        }),
      );
    });
  });
});
