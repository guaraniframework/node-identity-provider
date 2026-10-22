import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';

import { HttpResponseStatus } from '../http/response/http-response-status.enum';
import { ErrorResponse } from '../responses/error/error-response';
import { IdentityProviderError } from './identity-provider.error';

const invalidErrorCodes: any[] = [
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
];

const invalidErrorDescriptions: any[] = [
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
];

const invalidErrorOptions: any[] = [null, true, 1, 1.2, 1n, 'a', Symbol('a'), Buffer, Buffer.alloc(1), () => 1, []];

const invalidErrorOptionFatals: any[] = [
  undefined,
  null,
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
];

const invalidHttpResponseHeaderNames: any[] = [
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
];

const invalidHttpResponseHeaderValues: any[] = [
  undefined,
  null,
  true,
  1.2,
  -1,
  1n,
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

const invalidHttpResponseHeaders: any[] = [
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
  [],
];

const invalidHttpResponseStatus: any[] = [
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
  1,
];

const invalidUris: any[] = [
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
  '"',
];

describe('Identity Provider Error', () => {
  describe('constructor', () => {
    it.each(invalidErrorCodes)('should throw when the provided Error Code is invalid.', (error) => {
      expect(() => new IdentityProviderError(error, 'Identity Provider Error.')).toThrowWithMessage(
        TypeError,
        'The provided Error Code is invalid.',
      );
    });

    it.each(invalidErrorDescriptions)('should throw when the provided Error Description is invalid.', (description) => {
      expect(() => new IdentityProviderError('identity_provider_error', description)).toThrowWithMessage(
        TypeError,
        'The provided Error Description is invalid.',
      );
    });

    it.each(invalidErrorOptions)('should throw when the provided Error Options is invalid.', (errorOptions) => {
      expect(() => {
        return new IdentityProviderError('identity_provider_error', 'Identity Provider Error.', errorOptions);
      }).toThrowWithMessage(TypeError, 'The provided Error Options is invalid.');
    });

    it.each(invalidErrorOptionFatals)('should throw when the provided Error Option Fatal is invalid.', (fatal) => {
      expect(() => {
        return new IdentityProviderError('identity_provider_error', 'Identity Provider Error.', { fatal });
      }).toThrowWithMessage(TypeError, 'The provided Error Option Fatal is invalid.');
    });

    it('should instantiate an Identity Provider Error.', () => {
      let identityProviderError!: IdentityProviderError;

      expect(() => {
        identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');
      }).not.toThrow();

      expect(identityProviderError.cause).toBeUndefined();
      expect(identityProviderError.description).toBe('Identity Provider Error.');
      expect(identityProviderError.error).toBe('identity_provider_error');
      expect(identityProviderError.fatal).toBeFalse();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toBe('Identity Provider Error.');
      expect(identityProviderError.status).toBe(HttpResponseStatus.BadRequest);
      expect(identityProviderError.uri).toBeUndefined();
    });

    it('should instantiate an Identity Provider Error with Error Options.', () => {
      let identityProviderError!: IdentityProviderError;

      const cause = new Error('Cause Error.');

      expect(() => {
        identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.', {
          cause,
          fatal: true,
        });
      }).not.toThrow();

      expect(identityProviderError.cause).toBe(cause);
      expect(identityProviderError.description).toBe('Identity Provider Error.');
      expect(identityProviderError.error).toBe('identity_provider_error');
      expect(identityProviderError.fatal).toBeTrue();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toBe('Identity Provider Error.');
      expect(identityProviderError.status).toBe(HttpResponseStatus.BadRequest);
      expect(identityProviderError.uri).toBeUndefined();
    });
  });

  describe('setHttpHeader()', () => {
    it.each(invalidHttpResponseHeaderNames)('should throw when the provided Http Header Name is invalid.', (name) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Header Name is invalid.');
      expect(() => identityProviderError.setHttpHeader(name, 'header-value')).toThrowWithMessage(
        TypeError,
        error.message,
      );
    });

    it.each(invalidHttpResponseHeaderValues)(
      'should throw when the provided Http Header Value is invalid.',
      (value) => {
        const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

        const error = new TypeError('The provided Http Header Value is invalid.');
        expect(() => identityProviderError.setHttpHeader('header-name', value)).toThrowWithMessage(
          TypeError,
          error.message,
        );
      },
    );

    it('should add the provided Http Header to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeader('header-name', 'header-value')).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHttpHeaders()', () => {
    it.each(invalidHttpResponseHeaders)('should throw when the provided Http Headers is invalid.', (headers) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Headers is invalid.');
      expect(() => identityProviderError.setHttpHeaders(headers)).toThrowWithMessage(TypeError, error.message);
    });

    it('should add the provided Http Headers to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeaders({ 'header-name': 'header-value' })).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHttpStatus()', () => {
    it.each(invalidHttpResponseStatus)('should throw when the provided Http Status is invalid.', (status) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Status is invalid.');
      expect(() => identityProviderError.setHttpStatus(status)).toThrowWithMessage(TypeError, error.message);
    });

    it('should add the provided Http Status to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpStatus(HttpResponseStatus.ImATeapot)).not.toThrow();
      expect(identityProviderError.status).toBe(HttpResponseStatus.ImATeapot);
    });
  });

  describe('setUri()', () => {
    it.each(invalidUris)('should throw when the provided Error Page URI is invalid.', (uri) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Error Page URI is invalid.');
      expect(() => identityProviderError.setUri(uri)).toThrowWithMessage(TypeError, error.message);
    });

    it('should add the provided Error Page URI to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => {
        identityProviderError.setUri('https://provider.example.com/docs/identity_provider_error');
      }).not.toThrow();

      expect(identityProviderError.uri).toBe('https://provider.example.com/docs/identity_provider_error');
    });
  });

  describe('toJSON()', () => {
    it('should return an Error Response.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(identityProviderError.toJSON()).toStrictEqual<ErrorResponse>({
        error: 'identity_provider_error',
        error_description: 'Identity Provider Error.',
      });
    });

    it('should return an Error Response with an Error Page URI.', () => {
      const identityProviderError = new IdentityProviderError(
        'identity_provider_error',
        'Identity Provider Error.',
      ).setUri('https://provider.example.com/docs/identity_provider_error');

      expect(identityProviderError.toJSON()).toStrictEqual<ErrorResponse>({
        error: 'identity_provider_error',
        error_description: 'Identity Provider Error.',
        error_uri: 'https://provider.example.com/docs/identity_provider_error',
      });
    });
  });
});
