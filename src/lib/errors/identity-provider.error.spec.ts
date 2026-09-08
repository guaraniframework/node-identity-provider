import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';

import { getContainer } from '@guarani/di';

import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/container.token';
import { ErrorResponse } from '../responses/error-response';
import { IdentityProviderError } from './identity-provider.error';

jest.mock('../logger/logger');

class ConcreteIdentityProviderError extends IdentityProviderError {
  public override readonly error: any = 'concrete_identity_provider_error';
  protected override readonly uri?: string = 'http://idp.example.com/docs/concrete_identity_provider_error';
}

const invalidDescriptions: any[] = [
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

const invalidErrorOptions: any[] = [
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
    it.each(invalidDescriptions)('should throw when the provided Description is invalid.', (description) => {
      expect(() => new ConcreteIdentityProviderError(description)).toThrowWithMessage(
        TypeError,
        'The provided Description is invalid.',
      );
    });

    it.each(invalidErrorOptions)('should throw when the provided Error Options is invalid.', (errorOptions) => {
      expect(() => new ConcreteIdentityProviderError('Identity Provider Error.', errorOptions)).toThrowWithMessage(
        TypeError,
        'The provided Error Options is invalid.',
      );
    });

    it('should instantiate an Identity Provider Error.', () => {
      let identityProviderError!: IdentityProviderError;

      expect(() => {
        identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');
      }).not.toThrow();

      expect(identityProviderError.cause).toBeUndefined();
      expect(identityProviderError.error).toEqual('concrete_identity_provider_error');
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toEqual('Identity Provider Error.');
      expect(identityProviderError.status).toEqual(400);
      expect(identityProviderError['description']).toEqual('Identity Provider Error.');
      expect(identityProviderError['uri']).toEqual('http://idp.example.com/docs/concrete_identity_provider_error');
    });

    it('should instantiate an Identity Provider Error with Error Options.', () => {
      let identityProviderError!: IdentityProviderError;
      const cause = new Error('Cause Error.');

      expect(() => {
        identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.', { cause });
      }).not.toThrow();

      expect(identityProviderError.cause).toBe(cause);
      expect(identityProviderError.error).toEqual('concrete_identity_provider_error');
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({});
      expect(identityProviderError.message).toEqual('Identity Provider Error.');
      expect(identityProviderError.status).toEqual(400);
      expect(identityProviderError['description']).toEqual('Identity Provider Error.');
      expect(identityProviderError['uri']).toEqual('http://idp.example.com/docs/concrete_identity_provider_error');
    });
  });

  describe('setHttpHeader()', () => {
    it.each(invalidHttpHeaderNames)('should throw when the provided Http Header Name is invalid.', (header) => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      const error = new TypeError('The provided Http Header Name is invalid.');
      expect(() => identityProviderError.setHttpHeader(header, 'header-value')).toThrow(error);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConcreteIdentityProviderError] The provided Http Header Name is invalid',
        'e94b8c0e-b401-4f3c-8582-49f8f904f610',
        { header, value: 'header-value' },
        error,
      );
    });

    it.each(invalidHttpHeaderValues)('should throw when the provided Http Header Value is invalid.', (value) => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      const error = new TypeError('The provided Http Header Value is invalid.');
      expect(() => identityProviderError.setHttpHeader('header-name', value)).toThrow(error);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConcreteIdentityProviderError] The provided Http Header Value is invalid',
        'de07f209-6476-4a2f-a546-d209ec899773',
        { header: 'header-name', value },
        error,
      );
    });

    it('should add the provided Http Header to the Identity Provider Error.', () => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeader('header-name', 'header-value')).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHttpHeaders()', () => {
    it.each(invalidHttpHeaders)('should throw when the provided Http Headers is invalid.', (headers) => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      const error = new TypeError('The provided Http Headers is invalid.');
      expect(() => identityProviderError.setHttpHeaders(headers)).toThrow(error);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConcreteIdentityProviderError] The provided Http Headers is invalid',
        '336dcab3-19e5-4465-b98a-3f29df25c53a',
        { headers },
        error,
      );
    });

    it('should add the provided Http Headers to the Identity Provider Error.', () => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      expect(() => identityProviderError.setHttpHeaders({ 'header-name': 'header-value' })).not.toThrow();
      expect(identityProviderError.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('toJSON()', () => {
    it('should return an Error Response.', () => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      Reflect.deleteProperty(identityProviderError, 'uri');

      expect(identityProviderError.toJSON()).toStrictEqual<ErrorResponse>({
        error: 'concrete_identity_provider_error' as any,
        error_description: 'Identity Provider Error.',
      });
    });

    it('should return an Error Response with an Error Page URI.', () => {
      const identityProviderError = new ConcreteIdentityProviderError('Identity Provider Error.');

      expect(identityProviderError.toJSON()).toStrictEqual<ErrorResponse>({
        error: 'concrete_identity_provider_error' as any,
        error_description: 'Identity Provider Error.',
        error_uri: 'http://idp.example.com/docs/concrete_identity_provider_error',
      });

      expect(loggerMock.debug).toHaveBeenNthCalledWith(
        2,
        '[ConcreteIdentityProviderError] Added Error URI',
        '5117701f-3f3d-42fc-aecd-b166fb27a05a',
      );
    });
  });
});
