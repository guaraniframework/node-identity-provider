import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Client is not authorized to use the requested Grant.
 */
export class UnauthorizedClientError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'unauthorized_client';
}
