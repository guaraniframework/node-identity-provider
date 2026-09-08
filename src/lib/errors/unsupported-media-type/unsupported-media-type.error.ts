import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Http Header Content-Type is unsupported.
 */
export class UnsupportedMediaTypeError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'unsupported_media_type';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 415;
}
