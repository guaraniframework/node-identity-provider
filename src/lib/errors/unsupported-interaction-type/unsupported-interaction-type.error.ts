import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the requested Interaction Type is not supported by the Identity Provider.
 */
export class UnsupportedInteractionTypeError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'unsupported_interaction_type';
}
