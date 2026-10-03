import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider needs to prompt the User
 * to select an Authenticated Account before proceeding.
 */
export class AccountSelectionRequiredError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'account_selection_required';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 403;
}
