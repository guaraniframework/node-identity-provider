import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Client is invalid or fails to authenticate.
 */
export class InvalidClientError extends IdentityProviderError {
  /**
   * Instantiates a new Invalid Client Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.InvalidClient, description, options);
    this.setHttpStatus(HttpResponseStatus.Unauthorized);
  }
}
