if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Context
export { type ErrorRequestContext } from './lib/context/error-request.context';
// #endregion

// #region Endpoints
export { ErrorEndpoint } from './lib/endpoints/error/error.endpoint';
// #endregion

// #region Errors
export { ErrorCode } from './lib/errors/error-code.enum';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { type IdentityProviderErrorOptions } from './lib/errors/identity-provider-error.options';
export { InvalidRequestError } from './lib/errors/invalid-request/invalid-request.error';
export { MethodNotAllowedError } from './lib/errors/method-not-allowed/method-not-allowed.error';
export { ServerErrorError } from './lib/errors/server-error/server-error.error';
export { UnsupportedMediaTypeError } from './lib/errors/unsupported-media-type/unsupported-media-type.error';
// #endregion

// #region Http
export { IdentityProvider } from './lib/http/identity-provider';
export { HttpRequest } from './lib/http/request/http-request';
export { type HttpRequestParameters } from './lib/http/request/http-request.parameters';
export { type HttpRequestMethod } from './lib/http/request/http-request-method.type';
export { HttpResponse } from './lib/http/response/http-response';
// #endregion

// #region Logger
export { LogLevel } from './lib/logger/log-level.enum';
export { Logger } from './lib/logger/logger';
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
// #endregion

// #region Template Engine
export { TemplateEngine } from './lib/template-engine/template-engine';
// #endregion

// #region Validators
export { ErrorRequestValidator } from './lib/validators/error/error-request.validator';
export { Validator } from './lib/validators/validator';
// #endregion
