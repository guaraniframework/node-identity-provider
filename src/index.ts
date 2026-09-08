if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Endpoints
export { Endpoint } from './lib/endpoints/endpoint';
export { type EndpointName } from './lib/endpoints/endpoint-name.type';
// #endregion

// #region Errors
export { type ErrorCode } from './lib/errors/error-code.type';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { InvalidRequestError } from './lib/errors/invalid-request/invalid-request.error';
export { UnsupportedMediaTypeError } from './lib/errors/unsupported-media-type/unsupported-media-type.error';
// #endregion

// #region Http
export { HttpRequest } from './lib/http/request/http-request';
export { type HttpRequestParameters } from './lib/http/request/http-request.parameters';
export { type HttpRequestMethod } from './lib/http/request/http-request-method.type';
export { HttpResponse } from './lib/http/response/http-response';
// #endregion

// #region Logger
export { ConsoleLogger } from './lib/logger/console.logger';
export { LogLevel } from './lib/logger/log-level.enum';
export { Logger } from './lib/logger/logger';
// #endregion

// #region Metadata
export { CONTAINER } from './lib/metadata/container.token';
export { IdentityProviderFactory } from './lib/metadata/identity-provider.factory';
// #endregion

// #region Providers
export { IdentityProvider } from './lib/providers/identity-provider';
// #endregion

// #region Responses
export { type ErrorResponse } from './lib/responses/error-response';
// #endregion
