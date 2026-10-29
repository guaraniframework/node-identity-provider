import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider needs to get consent from the User before proceeding.
 */
export class ConsentRequiredError extends IdentityProviderError {
  /**
   * Instantiates a new Consent Required Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.ConsentRequired, description, options);
    this.setHttpStatus(HttpResponseStatus.Forbidden);
  }
}
