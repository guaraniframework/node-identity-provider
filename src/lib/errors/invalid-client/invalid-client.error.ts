import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Client fails to authenticate.
 */
export class InvalidClientError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'invalid_client';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 401;
}
