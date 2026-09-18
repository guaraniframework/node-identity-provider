import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Client fails to obtain authorization.
 */
export class AccessDeniedError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'access_denied';
}
