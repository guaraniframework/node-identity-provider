import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the requested Response Type is not supported by the Identity Provider.
 */
export class UnsupportedResponseTypeError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'unsupported_response_type';
}
