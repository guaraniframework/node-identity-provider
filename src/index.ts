if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

export { CONTAINER } from './lib/constants';
export { DataAccess } from './lib/data-access/data-access';
export { SQLiteDataAccess } from './lib/data-access/sqlite/sqlite.data-access';
export { Endpoint } from './lib/endpoints/endpoint';
export { type EndpointName } from './lib/endpoints/endpoint-name.type';
export { ErrorCode } from './lib/errors/error-code.enum';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { InvalidRequestError } from './lib/errors/invalid-request/invalid-request.error';
export { MethodNotAllowedError } from './lib/errors/method-not-allowed/method-not-allowed.error';
export { NotFoundError } from './lib/errors/not-found/not-found.error';
export { ServerErrorError } from './lib/errors/server-error/server-error.error';
export { UnsupportedMediaTypeError } from './lib/errors/unsupported-media-type/unsupported-media-type.error';
export { IdentityProviderFactory } from './lib/factory/identity-provider.factory';
export { IdentityProvider } from './lib/http/providers/identity-provider';
export { NodeIdentityProvider } from './lib/http/providers/node/node.identity-provider';
export { HttpRequest } from './lib/http/request/http-request';
export { HttpRequestMethod } from './lib/http/request/http-request-method.enum';
export { HttpResponse } from './lib/http/response/http-response';
export { HttpResponseStatus } from './lib/http/response/http-response-status.enum';
export { type HttpRoute } from './lib/http/route/http-route';
export { type HttpRouteHandler } from './lib/http/route/http-route.handler';
export { ConsoleLogger } from './lib/loggers/console/console.logger';
export { Logger } from './lib/loggers/logger';
export { LoggerLevel } from './lib/loggers/logger-level.enum';
export { type ErrorResponse } from './lib/responses/error/error-response';
export { Settings } from './lib/settings/settings';
