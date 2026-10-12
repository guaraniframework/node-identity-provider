if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}

// #region Metadata
export { IdentityProviderFactory } from './lib/metadata/factory/identity-provider.factory';
export { CONTAINER } from './lib/metadata/tokens';
// #endregion
