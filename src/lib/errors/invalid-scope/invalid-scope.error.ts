import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the requested Scope is invalid.
 */
export class InvalidScopeError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'invalid_scope';
}
