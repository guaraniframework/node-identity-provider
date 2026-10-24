import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Client is not authorized to use the requested Grant.
 */
export class UnauthorizedClientError extends IdentityProviderError {
  /**
   * Instantiates a new Unauthorized Client Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnauthorizedClient, description, options);
    this.setHttpStatus(HttpResponseStatus.Forbidden);
  }
}
