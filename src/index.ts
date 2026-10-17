if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Context
export { type ErrorRequestContext } from './lib/context/error-request.context';
// #endregion

// #region Endpoints
export { type EndpointName } from './lib/endpoints/endpoint-name.type';
export { ErrorEndpoint } from './lib/endpoints/error/error.endpoint';
// #endregion

// #region Errors
export { ErrorCode } from './lib/errors/error-code.enum';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { type IdentityProviderErrorOptions } from './lib/errors/identity-provider-error.options';
export { InvalidRequestError } from './lib/errors/invalid-request/invalid-request.error';
export { MethodNotAllowedError } from './lib/errors/method-not-allowed/method-not-allowed.error';
export { NotFoundError } from './lib/errors/not-found/not-found.error';
export { ServerErrorError } from './lib/errors/server-error/server-error.error';
export { UnsupportedMediaTypeError } from './lib/errors/unsupported-media-type/unsupported-media-type.error';
// #endregion

// #region Http
export { IdentityProvider } from './lib/http/identity-provider';
export { HttpRequest } from './lib/http/request/http-request';
export { type HttpRequestParameters } from './lib/http/request/http-request.parameters';
export { HttpRequestMethod } from './lib/http/request/http-request-method.enum';
export { HttpResponse } from './lib/http/response/http-response';
export { HttpResponseStatus } from './lib/http/response/http-response-status.enum';
export { HttpRouter } from './lib/http/router/http-router';
export { IdentityServer } from './lib/http/servers/identity-server';
export { NodeIdentityServer } from './lib/http/servers/node/node.identity-server';
// #endregion

// #region Logger
export { ConsoleLogger } from './lib/logger/console/console.logger';
export { Logger } from './lib/logger/logger';
export { LoggerLevel } from './lib/logger/logger-level.enum';
// #endregion

// #region Metadata
export { IdentityProviderFactory } from './lib/metadata/factory/identity-provider.factory';
export { CONTAINER } from './lib/metadata/tokens';
// #endregion

// #region Requests
export { type ErrorRequest } from './lib/requests/error-request';
// #endregion

// #region Responses
export { ErrorResponse } from './lib/responses/error/error-response';
export { type ErrorResponseParameters } from './lib/responses/error/error-response.parameters';
// #endregion

// #region Settings
export { Settings } from './lib/settings/settings';
export { type SettingsParameters } from './lib/settings/settings.parameters';
// #endregion

// #region Template Engine
export { TemplateEngine } from './lib/template-engine/template-engine';
export { TemplateStringTemplateEngine } from './lib/template-engine/template-string/template-string.template-engine';
// #endregion

// #region Validators
export { ErrorRequestValidator } from './lib/validators/error/error-request.validator';
export { RequestValidator } from './lib/validators/request-validator';
// #endregion
