import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';

import { getContainer } from '@guarani/di';

import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/tokens';
import { ErrorResponse } from '../responses/error/error-response';
import { ErrorResponseParameters } from '../responses/error/error-response.parameters';
import { IdentityProviderError } from './identity-provider.error';

jest.mock('../logger/logger');

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

const invalidHttpHeaderNames: any[] = [
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

const invalidHttpHeaderValues: any[] = [
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

const invalidHttpHeaders: any[] = [
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

const invalidHttpStatus: any[] = [
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
  '"',
];

describe('Invalid Provider Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

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

    it('should instantiate an Identity Provider Error.', () => {
      let identityProviderError!: IdentityProviderError;

      expect(() => {
        identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');
      }).not.toThrow();

      expect(identityProviderError.cause).toBeUndefined();
      expect(identityProviderError.description).toEqual('Identity Provider Error.');
      expect(identityProviderError.error).toEqual('identity_provider_error');
      expect(identityProviderError.fatal).toBeFalse();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toEqual('Identity Provider Error.');
      expect(identityProviderError.status).toEqual(400);
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
      expect(identityProviderError.description).toEqual('Identity Provider Error.');
      expect(identityProviderError.error).toEqual('identity_provider_error');
      expect(identityProviderError.fatal).toBeTrue();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toEqual('Identity Provider Error.');
      expect(identityProviderError.status).toEqual(400);
      expect(identityProviderError.uri).toBeUndefined();
    });
  });

  describe('setHttpHeader()', () => {
    it.each(invalidHttpHeaderNames)('should throw when the provided Http Header Name is invalid.', (name) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Header Name is invalid.');
      expect(() => identityProviderError.setHttpHeader(name, 'header-value')).toThrowWithMessage(
        TypeError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProviderError] The provided Http Header Name is invalid',
        'e94b8c0e-b401-4f3c-8582-49f8f904f610',
        { name, value: 'header-value' },
        error,
      );
    });

    it.each(invalidHttpHeaderValues)('should throw when the provided Http Header Value is invalid.', (value) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Header Value is invalid.');
      expect(() => identityProviderError.setHttpHeader('header-name', value)).toThrowWithMessage(
        TypeError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProviderError] The provided Http Header Value is invalid',
        'de07f209-6476-4a2f-a546-d209ec899773',
        { name: 'header-name', value },
        error,
      );
    });

    it('should add the provided Http Header to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeader('header-name', 'header-value')).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHttpHeaders()', () => {
    it.each(invalidHttpHeaders)('should throw when the provided Http Headers is invalid.', (headers) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Headers is invalid.');
      expect(() => identityProviderError.setHttpHeaders(headers)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProviderError] The provided Http Headers is invalid',
        '336dcab3-19e5-4465-b98a-3f29df25c53a',
        { headers },
        error,
      );
    });

    it('should add the provided Http Headers to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeaders({ 'header-name': 'header-value' })).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHttpStatus()', () => {
    it.each(invalidHttpStatus)('should throw when the provided Http Status is invalid.', (status) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Http Status is invalid.');
      expect(() => identityProviderError.setHttpStatus(status)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProviderError] The provided Http Status is invalid',
        '2bb27714-68cc-4dcc-98d3-32506d56c220',
        { status },
        error,
      );
    });

    it('should add the provided Http Status to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() => identityProviderError.setHttpStatus(418)).not.toThrow();
      expect(identityProviderError.status).toEqual(418);
    });
  });

  describe('setUri()', () => {
    it.each(invalidUris)('should throw when the provided Error Page URI is invalid.', (uri) => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const error = new TypeError('The provided Error Page URI is invalid.');
      expect(() => identityProviderError.setUri(uri)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdentityProviderError] The provided Error Page URI is invalid',
        '6a2e4338-ee31-4f7b-b705-82aa6e7853bb',
        { uri },
        error,
      );
    });

    it('should add the provided Error Page URI to the Identity Provider Error.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      expect(() =>
        identityProviderError.setUri('https://provider.example.com/docs/identity_provider_error'),
      ).not.toThrow();
      expect(identityProviderError.uri).toEqual('https://provider.example.com/docs/identity_provider_error');
    });
  });

  describe('toJSON()', () => {
    it('should return an Error Response.', () => {
      const identityProviderError = new IdentityProviderError('identity_provider_error', 'Identity Provider Error.');

      const errorResponse = identityProviderError.toJSON();

      expect(errorResponse).toBeInstanceOf(ErrorResponse);
      expect(errorResponse).toMatchObject<ErrorResponseParameters>({
        error: 'identity_provider_error',
        error_description: 'Identity Provider Error.',
        error_uri: expect.toBeNil(),
      });
    });

    it('should return an Error Response with an Error Page URI.', () => {
      const identityProviderError = new IdentityProviderError(
        'identity_provider_error',
        'Identity Provider Error.',
      ).setUri('https://provider.example.com/docs/identity_provider_error');

      const errorResponse = identityProviderError.toJSON();

      expect(errorResponse).toBeInstanceOf(ErrorResponse);
      expect(errorResponse).toMatchObject<ErrorResponseParameters>({
        error: 'identity_provider_error',
        error_description: 'Identity Provider Error.',
        error_uri: 'https://provider.example.com/docs/identity_provider_error',
      });
    });
  });
});
