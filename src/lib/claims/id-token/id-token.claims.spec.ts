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
    it('should throw when not providing the ID Token Claim "iss".', () => {
      const data = {} as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "iss".',
      );
    });

    it('should throw when not providing the ID Token Claim "sub".', () => {
      const data = { iss: 'https://server.example.com' } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "sub".',
      );
    });

    it('should throw when not providing the ID Token Claim "aud".', () => {
      const data = { iss: 'https://server.example.com', sub: 'user_id' } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "aud".',
      );
    });

    it('should throw when not providing the ID Token Claim "exp".', () => {
      const data = { iss: 'https://server.example.com', sub: 'user_id', aud: 'client_id' } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "exp".',
      );
    });

    it('should throw when not providing the ID Token Claim "iat".', () => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "iat".',
      );
    });

    it.each(invalidAuthTimes)('should throw when the provided claim "auth_time" is invalid.', (authTime) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: authTime,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "auth_time".',
      );
    });

    it.each(invalidNonces)('should throw when the provided claim "nonce" is invalid.', (nonce) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "nonce".',
      );
    });

    it.each(invalidAcrs)('should throw when the provided claim "acr" is invalid.', (acr) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce: 'nonce',
        acr,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "acr".',
      );
    });

    it.each(invalidAmrs)('should throw when the provided claim "amr" is invalid.', (amr) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce: 'nonce',
        acr: 'urn:guarani:acr:2fa',
        amr,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "amr".',
      );
    });

    it.each(invalidAzps)('should throw when the provided claim "azp" is invalid.', (azp) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce: 'nonce',
        acr: 'urn:guarani:acr:2fa',
        amr: ['pwd', 'sms'],
        azp,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "azp".',
      );
    });

    it.each(invalidAtHashes)('should throw when the provided claim "at_hash" is invalid.', (atHash) => {
      const data = {
        iss: 'https://server.example.com',
        sub: 'user_id',
        aud: 'client_id',
        exp: now + 3600,
        iat: now,
        auth_time: now,
        nonce: 'nonce',
        acr: 'urn:guarani:acr:2fa',
        amr: ['pwd', 'sms'],
        azp: 'client_id',
        at_hash: atHash,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "at_hash".',
      );
    });

    it.each(invalidCHashes)('should throw when the provided claim "c_hash" is invalid.', (cHash) => {
      const data = {
        iss: 'https://server.example.com',
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
        c_hash: cHash,
      } as IdTokenClaimsParameters;

      expect(() => new IdTokenClaims(data)).toThrowWithMessage(
        InvalidJsonWebTokenClaimsError,
        'Invalid ID Token Claim "c_hash".',
      );
    });

    it('should create an instance of id token claims.', () => {
      const claims: IdTokenClaimsParameters = {
        iss: 'https://server.example.com',
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

      const data = claims as IdTokenClaimsParameters;

      expect(new IdTokenClaims(data).parameters).toStrictEqual(claims);
    });
  });
});
