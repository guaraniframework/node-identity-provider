import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider needs to prompt the User to select an Authenticated Account before proceeding.
 */
export class AccountSelectionRequiredError extends IdentityProviderError {
  /**
   * Instantiates a new Account Selection Required Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.AccountSelectionRequired, description, options);
    this.setHttpStatus(HttpResponseStatus.Unauthorized);
  }
}
