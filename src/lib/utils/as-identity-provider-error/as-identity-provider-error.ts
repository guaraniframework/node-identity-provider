import { IdentityProviderError } from '../../errors/identity-provider.error';
import { ServerErrorError } from '../../errors/server-error/server-error.error';

/**
 * Treats the caught error into a valid Identity Provider Error.
 *
 * @param error Error caught.
 * @returns Treated Identity Provider Error.
 */
export function asIdentityProviderError(error: unknown): IdentityProviderError {
  return error instanceof IdentityProviderError
    ? error
    : new ServerErrorError('An unexpected error occurred.', { cause: error, fatal: true });
}
