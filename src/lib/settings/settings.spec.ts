import { Buffer } from 'buffer';
import { URL } from 'url';

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

describe('Settings', () => {
  describe('constructor', () => {
    it.each(invalidParameters)('should throw when the provided Settings Parameters is invalid.', (parameters) => {
      expect(() => new Settings(parameters)).toThrowWithMessage(
        TypeError,
        'The provided Settings Parameters is invalid.',
      );
    });

    it.each(invalidIssuers)('should throw when the provided Issuer URL is invalid.', (issuer) => {
      expect(() => new Settings({ issuer })).toThrowWithMessage(TypeError, 'The provided Issuer URL is invalid.');
    });

    it('should instantiate a new Settings.', () => {
      let settings!: Settings;

      expect(() => (settings = new Settings({ issuer: 'https://provider.example.com' }))).not.toThrow();

      expect(settings).toBeInstanceOf(Settings);
      expect(settings.issuer).toStrictEqual(new URL('https://provider.example.com'));
    });
  });
});
