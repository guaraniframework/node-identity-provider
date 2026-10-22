import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the provided Http Request Header Content-Type is not valid for the Identity Provider Request.
 */
export class UnsupportedMediaTypeError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Media Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnsupportedMediaType, description, options);
    this.setHttpStatus(HttpResponseStatus.UnsupportedMediaType);
  }
}
