import { InvalidJsonWebTokenClaimsError } from '@guarani/jose';

import { IdTokenClaims } from './id-token.claims';
import { IdTokenClaimsParameters } from './id-token.claims.parameters';

const invalidAuthTimes: any[] = [
  undefined,
  null,
  true,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  -1,
];

const invalidNonces: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

const invalidAcrs: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

const invalidAmrs: any[] = [
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
  [undefined, null, true, 1, 1.2, 1n, Symbol('a'), Buffer, Buffer.alloc(1), () => 1, {}, [], ''],
];

const invalidAzps: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

const invalidAtHashes: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

const invalidCHashes: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

describe('ID Token Claims', () => {
  const now = Math.ceil(Date.now() / 1000);

  describe('constructor', () => {
    let claims: IdTokenClaimsParameters;

    beforeEach(() => {
      claims = {
        iss: 'https://provider.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce: 'nonce',
        acr: 'urn:guarani:acr:2fa',
        amr: ['pwd', 'sms'],
        azp: 'client_id',
        at_hash: 'at_hash',
        c_hash: 'c_hash',
      };
    });

    it('should throw when not providing the ID Token Claim "iss".', () => {
      Reflect.deleteProperty(claims, 'iss');

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "iss".',
      );
    });

    it('should throw when not providing the ID Token Claim "sub".', () => {
      Reflect.deleteProperty(claims, 'sub');

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "sub".',
      );
    });

    it('should throw when not providing the ID Token Claim "aud".', () => {
      Reflect.deleteProperty(claims, 'aud');

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "aud".',
      );
    });

    it('should throw when not providing the ID Token Claim "exp".', () => {
      Reflect.deleteProperty(claims, 'exp');

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "exp".',
      );
    });

    it('should throw when not providing the ID Token Claim "iat".', () => {
      Reflect.deleteProperty(claims, 'iat');

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "iat".',
      );
    });

    it.each(invalidAuthTimes)('should throw when the provided claim "auth_time" is invalid.', (authTime) => {
      Reflect.set(claims, 'auth_time', authTime);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "auth_time".',
      );
    });

    it.each(invalidNonces)('should throw when the provided claim "nonce" is invalid.', (nonce) => {
      Reflect.set(claims, 'nonce', nonce);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "nonce".',
      );
    });

    it.each(invalidAcrs)('should throw when the provided claim "acr" is invalid.', (acr) => {
      Reflect.set(claims, 'acr', acr);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "acr".',
      );
    });

    it.each(invalidAmrs)('should throw when the provided claim "amr" is invalid.', (amr) => {
      Reflect.set(claims, 'amr', amr);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "amr".',
      );
    });

    it.each(invalidAzps)('should throw when the provided claim "azp" is invalid.', (azp) => {
      Reflect.set(claims, 'azp', azp);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "azp".',
      );
    });

    it.each(invalidAtHashes)('should throw when the provided claim "at_hash" is invalid.', (atHash) => {
      Reflect.set(claims, 'at_hash', atHash);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "at_hash".',
      );
    });

    it.each(invalidCHashes)('should throw when the provided claim "c_hash" is invalid.', (cHash) => {
      Reflect.set(claims, 'c_hash', cHash);

      expect(() => new IdTokenClaims(claims)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "c_hash".',
      );
    });

    it('should create an instance of ID Token Claims.', () => {
      expect(new IdTokenClaims(claims).parameters).toStrictEqual(claims);
    });
  });
});
