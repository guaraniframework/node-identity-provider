import { ErrorCode } from '../error-code.type';
import { IdentityProviderError } from '../identity-provider.error';

/**
 * Raised when the Identity Provider is not able to meet the Authentication Context Class References
 * requested by the Client during Authentication.
 */
export class UnmetAuthenticationRequirementsError extends IdentityProviderError {
  /**
   * OAuth 2.0 Error Code.
   */
  public readonly error: ErrorCode = 'unmet_authentication_requirements';
}
