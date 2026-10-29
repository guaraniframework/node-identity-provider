import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider needs an interaction from the User before proceeding.
 */
export class InteractionRequiredError extends IdentityProviderError {
  /**
   * Instantiates a new Interaction Required Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.InteractionRequired, description, options);
    this.setHttpStatus(HttpResponseStatus.Unauthorized);
  }
}
