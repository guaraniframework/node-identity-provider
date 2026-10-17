import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { ParsedUrlQueryInput, stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { getEnumValues, jsonStringify } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { HttpRequest } from './http-request';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.enum';

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
  '',
];

const invalidHttpRequestUrls: any[] = [
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
];

const invalidHttpRequestHeaders: any[] = [
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
  { 'header-name': undefined },
  { 'header-name': null },
  { 'header-name': true },
  { 'header-name': 1 },
  { 'header-name': 1.2 },
  { 'header-name': 1n },
  { 'header-name': Symbol('a') },
  { 'header-name': Buffer },
  { 'header-name': Buffer.alloc(1) },
  { 'header-name': () => 1 },
  { 'header-name': {} },
  { 'header-name': '' },
  { 'header-name': [] },
  { 'header-name': [undefined] },
  { 'header-name': [null] },
  { 'header-name': [true] },
  { 'header-name': [1] },
  { 'header-name': [1.2] },
  { 'header-name': [1n] },
  { 'header-name': [Symbol('a')] },
  { 'header-name': [Buffer] },
  { 'header-name': [Buffer.alloc(1)] },
  { 'header-name': [() => 1] },
  { 'header-name': [[]] },
  { 'header-name': [{}] },
  { 'header-name': [''] },
];

const invalidHttpRequestCookies: any[] = [
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

const invalidHttpRequestBodies: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  URL,
  new URL('https://provider.example.com/path'),
  () => 1,
  {},
  [],
];

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
    const parametersFactory = (parameters: Partial<HttpRequestParameters> = {}): HttpRequestParameters => {
      return Object.assign<HttpRequestParameters, Partial<HttpRequestParameters>>(
        {
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: HttpRequestMethod.GET,
          url: new URL('https://provider.example.com/path'),
        },
        parameters,
      );
    };

    it('should throw when not providing an Http Request Parameters.', () => {
      const error = new TypeError('The provided Http Request Parameters is invalid.');
      // @ts-expect-error
      expect(() => new HttpRequest()).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The provided Http Request Parameters is invalid',
        '67da0429-8878-42dc-bdf3-366aa1b3498c',
        { parameters: undefined },
        error,
      );
    });

    it.each(invalidHttpRequestParameters)(
      'should throw when the provided Http Request Parameters is invalid.',
      (parameters) => {
        const error = new TypeError('The provided Http Request Parameters is invalid.');
        expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpRequest] The provided Http Request Parameters is invalid',
          '67da0429-8878-42dc-bdf3-366aa1b3498c',
          { parameters },
          error,
        );
      },
    );

    it('should throw when not providing an Http Request Method.', () => {
      const parameters = parametersFactory();
      Reflect.deleteProperty(parameters, 'method');

      const error = new TypeError('Invalid Http Request Method.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Method',
        'e50215b7-52e5-48ae-acc6-db499998957b',
        { parameters },
        error,
      );
    });

    it.each(invalidHttpRequestMethods)('should throw when the provided Http Request Method is invalid.', (method) => {
      const parameters = parametersFactory({ method });

      const error = new TypeError('Invalid Http Request Method.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Method',
        'e50215b7-52e5-48ae-acc6-db499998957b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided Http Request Method is unsupported.', () => {
      const parameters = parametersFactory({ method: 'UNKNOWN' as HttpRequestMethod });

      const error = new TypeError('Unsupported Http Request Method "UNKNOWN".');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Unsupported Http Request Method "UNKNOWN"',
        '7ad7db5d-f71a-4d50-83b2-96bcd99f603d',
        { parameters },
        error,
      );
    });

    it('should throw when not providing an Http Request URL.', () => {
      const parameters = parametersFactory();
      Reflect.deleteProperty(parameters, 'url');

      const error = new TypeError('Invalid Http Request URL.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request URL',
        '73ece9e1-0322-48c4-a8e7-63370b8469a5',
        { parameters },
        error,
      );
    });

    it.each(invalidHttpRequestUrls)('should throw when the provided Http Request URL is invalid.', (url) => {
      const parameters = parametersFactory({ url });

      const error = new TypeError('Invalid Http Request URL.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request URL',
        '73ece9e1-0322-48c4-a8e7-63370b8469a5',
        { parameters },
        error,
      );
    });

    it('should throw when not providing an Http Request Headers.', () => {
      const parameters = parametersFactory();
      Reflect.deleteProperty(parameters, 'headers');

      const error = new TypeError('Invalid Http Request Headers.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Headers',
        '2b3d162f-0cce-4898-a596-b86a13361c79',
        { parameters },
        error,
      );
    });

    it.each(invalidHttpRequestHeaders)('should throw when the provided Http Request Headers is invalid.', (headers) => {
      const parameters = parametersFactory({ headers });

      const error = new TypeError('Invalid Http Request Headers.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Headers',
        '2b3d162f-0cce-4898-a596-b86a13361c79',
        { parameters },
        error,
      );
    });

    it('should throw when not providing an Http Request Cookies.', () => {
      const parameters = parametersFactory();
      Reflect.deleteProperty(parameters, 'cookies');

      const error = new TypeError('Invalid Http Request Cookies.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Cookies',
        '1c2fad7b-b5cc-41d4-93a4-9c767e719e44',
        { parameters },
        error,
      );
    });

    it.each(invalidHttpRequestCookies)('should throw when the provided Http Request Cookies is invalid.', (cookies) => {
      const parameters = parametersFactory({ cookies });

      const error = new TypeError('Invalid Http Request Cookies.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Cookies',
        '1c2fad7b-b5cc-41d4-93a4-9c767e719e44',
        { parameters },
        error,
      );
    });

    it('should throw when not providing an Http Request Body.', () => {
      const parameters = parametersFactory();
      Reflect.deleteProperty(parameters, 'body');

      const error = new TypeError('Invalid Http Request Body.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Body',
        '41e02795-c3ef-447f-b5c4-09eb3102ad4c',
        { parameters },
        error,
      );
    });

    it.each(invalidHttpRequestBodies)('should throw when the provided Http Request Body is invalid.', (body) => {
      const parameters = parametersFactory({ body });

      const error = new TypeError('Invalid Http Request Body.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] Invalid Http Request Body',
        '41e02795-c3ef-447f-b5c4-09eb3102ad4c',
        { parameters },
        error,
      );
    });

    it('should throw when the Http Request URL Query has duplicate Parameters.', () => {
      const parsedData: ParsedUrlQueryInput = { message: ['Hello', 'World'] };
      const data = stringifyQs(parsedData);

      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.', { fatal: true });

      expect(() => {
        return new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method: HttpRequestMethod.GET,
          url: addParametersToUrl('https://provider.example.com/path', parsedData),
        });
      }).toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The Http Request cannot have duplicate Parameters',
        '3c1a447c-7a57-47ee-bd27-b7c0c27f8252',
        { data, parsed_data: parsedData },
        error,
      );
    });

    it.each(getEnumValues(HttpRequestMethod))('should instantiate an Http Request.', (method) => {
      let request!: HttpRequest;

      expect(() => {
        request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: { 'cookie-name': 'cookie-value' },
          headers: { 'header-name': 'header-value' },
          method,
          url: new URL('https://provider.example.com/path?foo=bar'),
        });
      }).not.toThrow();

      expect(request.method).toEqual<HttpRequestMethod>(method);
      expect(request.path).toEqual('/path');
      expect(request.query).toMatchObject<NodeJS.Dict<string>>({ foo: 'bar' });
      expect(request.headers).toStrictEqual<IncomingHttpHeaders>({ 'header-name': 'header-value' });
      expect(request.cookies).toStrictEqual<NodeJS.Dict<unknown>>({ 'cookie-name': 'cookie-value' });
    });
  });

  describe('form()', () => {
    it('should throw when the provided Content-Type does not match the expected value of "application/x-www-form-urlencoded".', () => {
      const request = new HttpRequest({
        body: Buffer.from(jsonStringify({ message: 'Lorem ipsum.' })),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      const error = new UnsupportedMediaTypeError('Unexpected Content-Type "application/json".', { fatal: true });
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
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.', { fatal: true });
      expect(() => request.form()).toThrowWithMessage(InvalidRequestError, error.description);

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
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
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
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      const error = new UnsupportedMediaTypeError('Unexpected Content-Type "application/x-www-form-urlencoded".', {
        fatal: true,
      });

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
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      const error = new InvalidRequestError('The provided Http Request Body is invalid.', { fatal: true });
      expect(() => request.json()).toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpRequest] The provided Http Request Body is invalid',
        '38e50163-4812-45e5-bfe0-76a0a0a404e9',
        { data: '{' },
        error,
      );
    });

    it('should return the Http Request Body.', () => {
      const request = new HttpRequest({
        body: Buffer.from(jsonStringify({ message: 'Lorem ipsum.' }), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      expect(request.json()).toMatchObject<NodeJS.Dict<unknown>>({ message: 'Lorem ipsum.' });
    });
  });
});
