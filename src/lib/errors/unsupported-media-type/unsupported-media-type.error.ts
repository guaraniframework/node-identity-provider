import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Http Header Content-Type is not valid for the Endpoint.
 */
export class UnsupportedMediaTypeError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Media Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnsupportedMediaType, description, options);
    this.setHttpStatus(415);
  }
}
