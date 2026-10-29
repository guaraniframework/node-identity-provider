import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Client fails to obtain Authorization.
 */
export class AccessDeniedError extends IdentityProviderError {
  /**
   * Instantiates a new Access Denied Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.AccessDenied, description, options);
    this.setHttpStatus(HttpResponseStatus.Forbidden);
  }
}
