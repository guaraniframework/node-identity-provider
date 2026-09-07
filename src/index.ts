if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Logger
export { ConsoleLogger } from './lib/logger/console.logger';
export { LogLevel } from './lib/logger/log-level.enum';
export { Logger } from './lib/logger/logger';
// #endregion

// #region Metadata
export { CONTAINER } from './lib/metadata/container.token';
export { IdentityProviderFactory } from './lib/metadata/identity-provider.factory';
// #endregion
