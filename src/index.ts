if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Errors
export { ErrorCode } from './lib/errors/error-code.enum';
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { type IdentityProviderErrorOptions } from './lib/errors/identity-provider-error.options';
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
export { LogLevel } from './lib/logger/log-level.enum';
export { Logger } from './lib/logger/logger';
// #endregion

// #region Metadata
export { CONTAINER } from './lib/metadata/tokens';
// #endregion

// #region Responses
export { ErrorResponse } from './lib/responses/error/error-response';
export { type ErrorResponseParameters } from './lib/responses/error/error-response.parameters';
// #endregion

// #region Template Engine
export { TemplateEngine } from './lib/template-engine/template-engine';
// #endregion
