if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

export { CONTAINER } from './lib/constants';
export { IdentityProviderFactory } from './lib/factory/identity-provider.factory';
