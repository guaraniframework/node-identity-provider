import { getContainer } from '@guarani/di';

import { EndpointName } from '../../endpoints/endpoint-name.type';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpEndpoint } from './http-endpoint';
import { HttpRouter } from './http-router';

jest.mock('../../logger/logger');

const invalidEndpointNames: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(0),
  () => 1,
  {},
  [],
  '',
];

const invalidHttpEndpoints: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(0),
  () => 1,
  [],
];

const invalidHttpEndpointPaths: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(0),
  () => 1,
  {},
  [],
  '',
];

const invalidHttpEndpointRoutes: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(0),
  () => 1,
  {},
  [],
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  ['a'],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(0)],
  [() => 1],
  [[]],
  [{}],
  [{ method: undefined }],
  [{ method: null }],
  [{ method: true }],
  [{ method: 1 }],
  [{ method: 1.2 }],
  [{ method: 1n }],
  [{ method: Symbol('a') }],
  [{ method: Buffer }],
  [{ method: Buffer.alloc(0) }],
  [{ method: () => 1 }],
  [{ method: {} }],
  [{ method: [] }],
  [{ method: '' }],
  [{ method: 'a' }],
  [{ method: HttpRequestMethod.GET, handler: undefined }],
  [{ method: HttpRequestMethod.GET, handler: null }],
  [{ method: HttpRequestMethod.GET, handler: true }],
  [{ method: HttpRequestMethod.GET, handler: 1 }],
  [{ method: HttpRequestMethod.GET, handler: 1.2 }],
  [{ method: HttpRequestMethod.GET, handler: 1n }],
  [{ method: HttpRequestMethod.GET, handler: 'a' }],
  [{ method: HttpRequestMethod.GET, handler: Symbol('a') }],
  [{ method: HttpRequestMethod.GET, handler: Buffer }],
  [{ method: HttpRequestMethod.GET, handler: Buffer.alloc(0) }],
  [{ method: HttpRequestMethod.GET, handler: {} }],
  [{ method: HttpRequestMethod.GET, handler: [] }],
];

describe('Http Router', () => {
  let router: HttpRouter;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  let endpoint: HttpEndpoint;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(HttpRouter).toSelf().asSingleton();

    router = container.resolve(HttpRouter);

    endpoint = { path: '/oidc/custom', routes: [{ method: HttpRequestMethod.GET, handler: async () => {} }] };
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoints', () => {
    it('should be an instance of a Map.', () => {
      expect(router['endpoints']).toBeInstanceOf(Map);
    });
  });

  describe('addEndpoint()', () => {
    it.each(invalidEndpointNames)('should throw when the provided Endpoint Name is invalid.', (name) => {
      const error = new TypeError('The provided Endpoint Name is invalid.');
      expect(() => router.addEndpoint(name, endpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[HttpRouter] The provided Endpoint Name is invalid',
        '729c0c4f-363c-4b10-9e8d-07c9083fa271',
        { name, endpoint },
        error,
      );
    });

    it('should throw when the provided Endpoint Name is already registered at the Http Router.', () => {
      router['endpoints'].set('custom' as EndpointName, endpoint);

      const error = new TypeError('The provided Endpoint Name is already registered.');
      expect(() => router.addEndpoint('custom' as EndpointName, endpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[HttpRouter] The provided Endpoint Name is already registered',
        '2947f743-2c10-4097-adda-3993b2e8ceb4',
        { name: 'custom', endpoint },
        error,
      );
    });

    it.each(invalidHttpEndpoints)('should throw when the provided Http Endpoint is invalid.', (endpoint) => {
      const error = new TypeError('The provided Http Endpoint is invalid.');
      expect(() => router.addEndpoint('custom' as EndpointName, endpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        `[HttpRouter] The provided Http Endpoint is invalid`,
        'ac39c4cd-87c5-4b4b-8b4d-5af73a853803',
        { name: 'custom', endpoint },
        error,
      );
    });

    it.each(invalidHttpEndpointPaths)('should throw when the provided Http Endpoint Path is invalid.', (path) => {
      Reflect.set(endpoint, 'path', path);

      const error = new TypeError('The provided Http Endpoint Path is invalid.');
      expect(() => router.addEndpoint('custom' as EndpointName, endpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        `[HttpRouter] The provided Http Endpoint Path is invalid`,
        '2abe32c4-fb0e-4026-abc6-8fad6e5c2773',
        { name: 'custom', endpoint },
        error,
      );
    });

    it.each(invalidHttpEndpointRoutes)('should throw when the provided Http Endpoint Routes is invalid.', (routes) => {
      Reflect.set(endpoint, 'routes', routes);

      const error = new TypeError('The provided Http Endpoint Routes is invalid.');
      expect(() => router.addEndpoint('custom' as EndpointName, endpoint)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        `[HttpRouter] The provided Http Endpoint Routes is invalid`,
        '52534f39-92a0-4a0d-afdf-5ed016b44c83',
        { name: 'custom', endpoint },
        error,
      );
    });

    it('should add the provided Http Endpoint to the Http Router.', () => {
      expect(() => router.addEndpoint('custom' as EndpointName, endpoint)).not.toThrow();

      expect(router['endpoints'].size).toEqual(1);
      expect(router['endpoints'].get('custom' as EndpointName)).toBe(endpoint);
    });
  });

  describe('getEndpoints()', () => {
    it('should return all registered Http Endpoints.', () => {
      router.addEndpoint('custom' as EndpointName, {
        path: '/oidc/custom',
        routes: [{ method: HttpRequestMethod.GET, handler: async () => {} }],
      });

      router.addEndpoint('foobar' as EndpointName, {
        path: '/oidc/foobar',
        routes: [{ method: HttpRequestMethod.POST, handler: async () => {} }],
      });

      expect(router.getEndpoints()).toStrictEqual<HttpEndpoint[]>([
        { path: '/oidc/custom', routes: [{ method: HttpRequestMethod.GET, handler: expect.toBeFunction() }] },
        { path: '/oidc/foobar', routes: [{ method: HttpRequestMethod.POST, handler: expect.toBeFunction() }] },
      ]);
    });
  });

  describe('getEndpoint()', () => {
    beforeEach(() => {
      router.addEndpoint('custom' as EndpointName, endpoint);
    });

    it.each(invalidEndpointNames)('should throw when the requested Http Endpoint is invalid.', (name) => {
      const error = new TypeError('The requested Http Endpoint is invalid.');
      expect(() => router.getEndpoint(name)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[HttpRouter] The requested Http Endpoint is invalid',
        'd73edf0e-2e73-44f6-b79f-ed517e57813a',
        { name },
        error,
      );
    });

    it('should throw when the requested Http Endpoint is not registered.', () => {
      const error = new TypeError('The requested Http Endpoint is not registered.');
      expect(() => router.getEndpoint('unknown' as any)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[HttpRouter] The requested Http Endpoint is not registered',
        '467cdc30-540c-46ab-86f7-649e267b951c',
        { name: 'unknown' },
        error,
      );
    });

    it('should return the requested Http Endpoint.', () => {
      expect(router.getEndpoint('custom' as EndpointName)).toBe(endpoint);
    });
  });
});
