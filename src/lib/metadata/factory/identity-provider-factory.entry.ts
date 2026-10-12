import { Constructor, Factory } from '@guarani/di';

/**
 * Indicates an Entry to the Identity Provider Factory.
 */
export type IdentityProviderFactoryEntry<T> = T | Constructor<T> | Factory<T>;
