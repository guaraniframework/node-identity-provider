import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider Request is invalid.
 */
export class InvalidRequestError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'invalid_request';
}
