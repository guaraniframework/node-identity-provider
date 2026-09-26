import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider encounters an unexpected error.
 */
export class ServerErrorError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'server_error';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 500;
}
