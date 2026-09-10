if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Endpoints
export { Endpoint } from './lib/endpoints/endpoint';
export { type EndpointName } from './lib/endpoints/endpoint-name.type';
// #endregion

// #region Entities
export { Client } from './lib/entities/client';
export { ClientSecret } from './lib/entities/client-secret';
// #endregion

// #region Errors
export { AccessDeniedError } from './lib/errors/access-denied/access-denied.error';
export { type ErrorCode } from './lib/errors/error-code.type';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { InvalidRequestError } from './lib/errors/invalid-request/invalid-request.error';
export { InvalidScopeError } from './lib/errors/invalid-scope/invalid-scope.error';
export { UnsupportedMediaTypeError } from './lib/errors/unsupported-media-type/unsupported-media-type.error';
// #endregion

// #region Handlers
export { ScopeHandler } from './lib/handlers/scope/scope.handler';
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

// #region Services
export { ClientService } from './lib/services/client.service';
// #endregion

// #region Settings
export { type Settings } from './lib/settings/settings';
export { SETTINGS } from './lib/settings/settings.token';
// #endregion

// #region Types
export { type ApplicationType } from './lib/types/application-type.type';
export { type ClientType } from './lib/types/client-type.type';
// #endregion
