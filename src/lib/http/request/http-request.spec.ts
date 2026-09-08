import { Buffer } from 'buffer';
import { ParsedUrlQueryInput, stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { HttpRequest } from './http-request';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.type';

jest.mock('../../logger/logger');

const invalidHttpRequestParameters: any[] = [
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

const invalidHttpRequestMethods: any[] = [
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

const httpRequestMethods: HttpRequestMethod[] = ['DELETE', 'GET', 'POST', 'PUT'];

describe('Http Request', () => {
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
    it.each(invalidHttpRequestParameters)(
      'should throw when the provided Http Request Parameters is invalid.',
      (parameters) => {
        expect(() => new HttpRequest(parameters)).toThrowWithMessage(
          TypeError,
          'The provided Http Request Parameters is invalid.',
        );
      },
    );

    it.each(invalidHttpRequestMethods)('should throw when the provided Http Request Method is invalid.', (method) => {
      const error = new TypeError('Invalid Http Request Method.');
      expect(() => new HttpRequest({ method } as HttpRequestParameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Method',
        'e50215b7-52e5-48ae-acc6-db499998957b',
        { method },
        error,
      );
    });

    it('should throw when providing an unsupported Http Request Method.', () => {
      const error = new TypeError('Unsupported Http Request Method "UNKNOWN".');

      expect(() => new HttpRequest({ method: 'UNKNOWN' as any } as HttpRequestParameters)).toThrowWithMessage(
        TypeError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Unsupported Http Request Method "UNKNOWN"',
        '7ad7db5d-f71a-4d50-83b2-96bcd99f603d',
        { method: 'UNKNOWN' },
        error,
      );
    });

    it('should throw when the Http Request URL Query has duplicate Parameters.', () => {
      const parsedData: ParsedUrlQueryInput = { message: ['Hello', 'World'] };
      const data = stringifyQs(parsedData);

      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.');

      expect(() => {
        return new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: 'GET',
          url: new URL(`http://idp.example.com/path?${data}`),
        });
      }).toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The Http Request cannot have duplicate Parameters',
        '3c1a447c-7a57-47ee-bd27-b7c0c27f8252',
        { data, parsed_data: parsedData },
        error,
      );
    });

    it.each(httpRequestMethods)('should instantiate an Http Request.', (method) => {
      let request!: HttpRequest;

      expect(() => {
        request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method,
          url: new URL('http://idp.example.com/path?foo=bar'),
        });
      }).not.toThrow();

      expect(request.path).toEqual('/path');
      expect(request.query).toMatchObject<NodeJS.Dict<string>>({ foo: 'bar' });
    });
  });

  describe('form()', () => {
    it('should throw when the provided Content-Type does not match the expected value of "application/x-www-form-urlencoded".', () => {
      const request = new HttpRequest({
        body: Buffer.from(jsonStringify({ message: 'Lorem ipsum.' })),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      const error = new UnsupportedMediaTypeError('Unexpected Content-Type "application/json".');
      expect(() => request.form()).toThrowWithMessage(UnsupportedMediaTypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Unexpected Content-Type "application/json"',
        '5467b458-527c-42ac-958f-02b20ccf732d',
        { content_type: 'application/x-www-form-urlencoded' },
        error,
      );
    });

    it('should throw when the Http Request Body has duplicate Parameters.', () => {
      const parsedData: ParsedUrlQueryInput = { message: ['Hello', 'World'] };
      const data = stringifyQs(parsedData);

      const request = new HttpRequest({
        body: Buffer.from(data, 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.');
      expect(() => request.form()).toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The Http Request cannot have duplicate Parameters',
        '3c1a447c-7a57-47ee-bd27-b7c0c27f8252',
        { data, parsed_data: parsedData },
        error,
      );
    });

    it('should return the Http Request Body.', () => {
      const request = new HttpRequest({
        body: Buffer.from(stringifyQs({ message: 'Lorem ipsum.' }), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      expect(request.form()).toMatchObject<NodeJS.Dict<string>>({ message: 'Lorem ipsum.' });
    });
  });

  describe('json()', () => {
    it('should throw when the provided Content-Type does not match the expected value of "application/json".', () => {
      const request = new HttpRequest({
        body: Buffer.from(stringifyQs({ message: 'Lorem ipsum.' })),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      const error = new UnsupportedMediaTypeError('Unexpected Content-Type "application/x-www-form-urlencoded".');
      expect(() => request.json()).toThrowWithMessage(UnsupportedMediaTypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Unexpected Content-Type "application/x-www-form-urlencoded"',
        '5467b458-527c-42ac-958f-02b20ccf732d',
        { content_type: 'application/json' },
        error,
      );
    });

    it('should throw when the Http Request Body is invalid.', () => {
      const request = new HttpRequest({
        body: Buffer.from('{', 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      const error = new InvalidRequestError('The provided Http Request Body is invalid.');
      expect(() => request.json()).toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The provided Http Request Body is invalid',
        '38e50163-4812-45e5-bfe0-76a0a0a404e9',
        { body: '{' },
        error,
      );
    });

    it('should return the Http Request Body.', () => {
      const request = new HttpRequest({
        body: Buffer.from(jsonStringify({ message: 'Lorem ipsum.' }), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: new URL('http://idp.example.com/path'),
      });

      expect(request.json()).toMatchObject<NodeJS.Dict<unknown>>({ message: 'Lorem ipsum.' });
    });
  });
});
