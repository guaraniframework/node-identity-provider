if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Logger
export { ConsoleLogger } from './lib/logger/console/console.logger';
export { Logger } from './lib/logger/logger';
export { LoggerLevel } from './lib/logger/logger-level.enum';
// #endregion

// #region Metadata
export { IdentityProviderFactory } from './lib/metadata/factory/identity-provider.factory';
export { CONTAINER } from './lib/metadata/tokens';
// #endregion
