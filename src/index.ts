if (Reflect == null || !('getMetadata' in Reflect)) {
  throw new Error('@guarani/identity-provider requires a Reflect Metadata polyfill.');
}
