import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider is not able to meet the Authentication Context Class References
 * requested by the Client during Authentication.
 */
export class UnmetAuthenticationRequirementsError extends IdentityProviderError {
  /**
   * Instantiates a new Unmet Authentication Requirements Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnmetAuthenticationRequirements, description, options);
    this.setHttpStatus(HttpResponseStatus.Unauthorized);
  }
}
