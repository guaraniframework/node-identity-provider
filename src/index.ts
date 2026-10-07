if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Errors
export { IdentityProviderError } from './lib/errors/identity-provider.error';
export { type IdentityProviderErrorOptions } from './lib/errors/identity-provider-error.options';
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
