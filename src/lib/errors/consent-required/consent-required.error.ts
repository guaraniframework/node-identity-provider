import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider needs to get consent from the User before proceeding.
 */
export class ConsentRequiredError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'consent_required';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 403;
}
