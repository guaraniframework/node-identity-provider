if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

export { CONTAINER } from './lib/constants';
export { IdentityProviderFactory } from './lib/factory/identity-provider.factory';
export { ConsoleLogger } from './lib/loggers/console/console.logger';
export { Logger } from './lib/loggers/logger';
export { LoggerLevel } from './lib/loggers/logger-level.enum';
