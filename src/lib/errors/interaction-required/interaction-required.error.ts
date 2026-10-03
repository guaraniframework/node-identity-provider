import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider needs an interaction from the User before proceeding.
 */
export class InteractionRequiredError extends IdentityProviderError {
  /**
   * Error Code.
   */
  public readonly error: ErrorCode = 'interaction_required';

  /**
   * Http Response Status Code.
   */
  public override readonly status: number = 401;
}
