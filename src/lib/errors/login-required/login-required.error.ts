import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider needs to authenticate the User before proceeding.
 */
export class LoginRequiredError extends IdentityProviderError {
  /**
   * Instantiates a new Login Required Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.LoginRequired, description, options);
    this.setHttpStatus(HttpResponseStatus.Unauthorized);
  }
}
