import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify } from '@guarani/primitives';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { HttpResponse } from './http-response';
import { HttpResponseStatus } from './http-response-status.enum';

jest.mock('../../logger/logger');

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
  '',
];

const invalidHttpResponseHeaderValues: any[] = [
  undefined,
  null,
  true,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
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
  [''],
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

const invalidHttpResponseCookieNames: any[] = [
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

const invalidHttpResponseCookies: any[] = [
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

const invalidRedirectURLs: any[] = [
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
  'a',
  new URL('https://client.example.com/oidc/callback'),
];

const invalidJsonData: any[] = [
  undefined,
  1n,
  Symbol('a'),
  Buffer,
  () => 1,
  { data: undefined },
  { data: 1n },
  { data: Symbol('a') },
  { data: Buffer },
  { data: () => 1 },
  [undefined],
  [1n],
  [Symbol('a')],
  [Buffer],
  [() => 1],
];

const invalidHtmls: any[] = [
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

describe('Http Response', () => {
  let response: HttpResponse;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);

    response = new HttpResponse();
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('setStatus()', () => {
    it.each(invalidHttpResponseStatus)('should throw when the provided Http Response Status is invalid.', (status) => {
      const error = new TypeError('The provided Http Response Status is invalid.');
      expect(() => response.setStatus(status)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpResponse] The provided Http Response Status is invalid',
        'b5e98f84-21a9-465f-b8b1-df4882839505',
        { status },
        error,
      );
    });

    it('should set the Status of the Http Response.', () => {
      expect(() => response.setStatus(HttpResponseStatus.Created)).not.toThrow();
      expect(response.status).toEqual(HttpResponseStatus.Created);
    });
  });

  describe('setHeader()', () => {
    it.each(invalidHttpResponseHeaderNames)(
      'should throw when the provided Http Response Header Name is invalid.',
      (name) => {
        const error = new TypeError('The provided Http Response Header Name is invalid.');
        expect(() => response.setHeader(name, 'header-value')).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpResponse] The provided Http Response Header Name is invalid',
          'e2bfa470-f1f3-42b6-8dd3-d947cc9f550c',
          { name, value: 'header-value' },
          error,
        );
      },
    );

    it.each(invalidHttpResponseHeaderValues)(
      'should throw when the provided Http Response Header Value is invalid.',
      (value) => {
        const error = new TypeError('The provided Http Response Header Value is invalid.');
        expect(() => response.setHeader('header-name', value)).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpResponse] The provided Http Response Header Value is invalid',
          '1105c9ef-9c6d-4362-9e15-f6d842a72071',
          { name: 'header-name', value },
          error,
        );
      },
    );

    it('should add the provided Header to the Http Response.', () => {
      expect(() => response.setHeader('header-name', 'header-value')).not.toThrow();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setHeaders()', () => {
    it.each(invalidHttpResponseHeaders)(
      'should throw when the provided Http Response Headers is invalid.',
      (headers) => {
        const error = new TypeError('The provided Http Response Headers is invalid.');
        expect(() => response.setHeaders(headers)).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpResponse] The provided Http Response Headers is invalid',
          '801bbc51-6520-4e57-a970-076eeecd95f9',
          { headers },
          error,
        );
      },
    );

    it('should add the provided Headers to the Http Response.', () => {
      expect(() => response.setHeaders({ 'header-name': 'header-value' })).not.toThrow();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'header-name': 'header-value' });
    });
  });

  describe('setCookie()', () => {
    it.each(invalidHttpResponseCookieNames)(
      'should throw when the provided Http Response Cookie Name is invalid.',
      (name) => {
        const error = new TypeError('The provided Http Response Cookie Name is invalid.');
        expect(() => response.setCookie(name, 'cookie-value')).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpResponse] The provided Http Response Cookie Name is invalid',
          '27ec17db-b9b3-42d7-b03f-eeb2e2167367',
          { name, value: 'cookie-value' },
          error,
        );
      },
    );

    it('should add the provided Cookie to the Http Response.', () => {
      expect(() => response.setCookie('cookie-name', 'cookie-value')).not.toThrow();
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({ 'cookie-name': 'cookie-value' });
    });
  });

  describe('setCookies()', () => {
    it.each(invalidHttpResponseCookies)(
      'should throw when the provided Http Response Cookies is invalid.',
      (cookies) => {
        const error = new TypeError('The provided Http Response Cookies is invalid.');
        expect(() => response.setCookies(cookies)).toThrowWithMessage(TypeError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[HttpResponse] The provided Http Response Cookies is invalid',
          '1fa2fdaf-8fb5-4460-b77c-1f91a7e0ae23',
          { cookies },
          error,
        );
      },
    );

    it('should add the provided Cookies to the Http Response.', () => {
      expect(() => response.setCookies({ 'cookie-name': 'cookie-value' })).not.toThrow();
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({ 'cookie-name': 'cookie-value' });
    });
  });

  describe('redirect()', () => {
    it.each(invalidRedirectURLs)('should throw when the provided Redirect URL is invalid.', (url) => {
      const error = new TypeError('The provided Redirect URL is invalid.');
      expect(() => response.redirect(url)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpResponse] The provided Redirect URL is invalid',
        'fb5c2207-b5ac-4dfe-bc68-317d4b89d4be',
        { url },
        error,
      );
    });

    it('should set the provided Redirect URL as the Redirect Http Response.', () => {
      const url = 'https://client.example.com/oidc/callback';

      expect(() => response.redirect(url)).not.toThrow();

      expect(response.status).toEqual(HttpResponseStatus.SeeOther);
      expect(response.headers.location).toEqual(url);
      expect(response.body).toEqual(Buffer.alloc(0));
    });
  });

  describe('json()', () => {
    it.each(invalidJsonData)('should throw when the provided JSON Data is invalid.', (data) => {
      const error = new TypeError('The provided JSON Data is invalid.');
      expect(() => response.json(data)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpResponse] The provided JSON Data is invalid',
        'b8d49f56-e880-4a71-95cc-41e7df6267eb',
        { data },
        error,
      );
    });

    it('should set the provided JSON Data as the Body of the Http Response.', () => {
      const data: NodeJS.Dict<unknown> = {
        a: null,
        b: true,
        c: 1,
        d: 1.2,
        e: 'a',
        f: Buffer.alloc(1),
        g: [null, true, 1, 1.2, 'a', Buffer.alloc(1), {}, []],
        h: { i: null, j: true, k: 1, l: 1.2, m: 'a', n: Buffer.alloc(1), o: {}, p: [] },
      };

      expect(() => response.json(data)).not.toThrow();

      expect(response.headers['content-type']).toBe('application/json');
      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(data), 'utf8'));
    });
  });

  describe('html()', () => {
    it.each(invalidHtmls)('should throw when the provided Html is invalid.', (html) => {
      const error = new TypeError('The provided Html is invalid.');
      expect(() => response.html(html)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[HttpResponse] The provided Html is invalid',
        'e4b73ff5-f126-4765-87a1-4bc9ba4aa7ac',
        { html },
        error,
      );
    });

    it('should set the provided Html as the Body of the Http Response.', () => {
      const html = '<html></html>';

      expect(() => response.html(html)).not.toThrow();

      expect(response.headers['content-type']).toBe('text/html; charset=UTF-8');
      expect(response.body).toStrictEqual(Buffer.from(html, 'utf8'));
    });
  });
});
