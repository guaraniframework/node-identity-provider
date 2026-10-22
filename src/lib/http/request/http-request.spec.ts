import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import qs, { ParsedUrlQuery } from 'querystring';
import { URL } from 'url';

import { getEnumValues, jsonStringify } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { HttpRequest } from './http-request';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.enum';

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

    it.each(invalidHttpRequestParameters)(
      'should throw when the provided Http Request Parameters is invalid.',
      (parameters) => {
        const error = new TypeError('The provided Http Request Parameters is invalid.');
        expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
      },
    );

    it.each(invalidHttpRequestMethods)('should throw when the provided Http Request Method is invalid.', (method) => {
      const parameters = parametersFactory({ method });

      const error = new TypeError('Invalid Http Request Method.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
    });

    it('should throw when the provided Http Request Method is unsupported.', () => {
      const parameters = parametersFactory({ method: 'UNKNOWN' as HttpRequestMethod });

      const error = new TypeError('Unsupported Http Request Method "UNKNOWN".');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
    });

    it.each(invalidHttpRequestUrls)('should throw when the provided Http Request URL is invalid.', (url) => {
      const parameters = parametersFactory({ url });

      const error = new TypeError('Invalid Http Request URL.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
    });

    it.each(invalidHttpRequestHeaders)('should throw when the provided Http Request Headers is invalid.', (headers) => {
      const parameters = parametersFactory({ headers });

      const error = new TypeError('Invalid Http Request Headers.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
    });

    it.each(invalidHttpRequestCookies)('should throw when the provided Http Request Cookies is invalid.', (cookies) => {
      const parameters = parametersFactory({ cookies });

      const error = new TypeError('Invalid Http Request Cookies.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
    });

    it.each(invalidHttpRequestBodies)('should throw when the provided Http Request Body is invalid.', (body) => {
      const parameters = parametersFactory({ body });

      const error = new TypeError('Invalid Http Request Body.');
      expect(() => new HttpRequest(parameters)).toThrowWithMessage(TypeError, error.message);
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

      expect(request.method).toBe<HttpRequestMethod>(method);
      expect(request.path).toBe('/path');
      expect(request.query).toStrictEqual<ParsedUrlQuery>(expect.objectContaining({ foo: 'bar' }));
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
      expect(() => request.form()).toThrowWithMessage(UnsupportedMediaTypeError, error.description);
    });

    it('should return the Http Request Body.', () => {
      const request = new HttpRequest({
        body: Buffer.from(qs.stringify({ message: 'Lorem ipsum.' }), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      expect(request.form()).toStrictEqual<NodeJS.Dict<string>>(expect.objectContaining({ message: 'Lorem ipsum.' }));
    });
  });

  describe('json()', () => {
    it('should throw when the provided Content-Type does not match the expected value of "application/json".', () => {
      const request = new HttpRequest({
        body: Buffer.from(qs.stringify({ message: 'Lorem ipsum.' })),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      const error = new UnsupportedMediaTypeError('Unexpected Content-Type "application/x-www-form-urlencoded".', {
        fatal: true,
      });

      expect(() => request.json()).toThrowWithMessage(UnsupportedMediaTypeError, error.description);
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
    });

    it('should return the Http Request Body.', () => {
      const request = new HttpRequest({
        body: Buffer.from(jsonStringify({ message: 'Lorem ipsum.' }), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/json' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/path'),
      });

      expect(request.json()).toStrictEqual<NodeJS.Dict<unknown>>({ message: 'Lorem ipsum.' });
    });
  });
});
