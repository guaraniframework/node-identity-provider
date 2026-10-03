import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider needs to authenticate the User before proceeding.
 */
export class LoginRequiredError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'login_required';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 401;
}
