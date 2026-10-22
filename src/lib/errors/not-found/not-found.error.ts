import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the requested Endpoint does not exist in the Identity Provider.
 */
export class NotFoundError extends IdentityProviderError {
  /**
   * Instantiates a new Not Found Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.NotFound, description, options);
    this.setHttpStatus(HttpResponseStatus.NotFound);
  }
}
