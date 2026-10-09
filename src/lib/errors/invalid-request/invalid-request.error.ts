import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider Request is invalid, contains invalid parameters or is otherwise malformed.
 */
export class InvalidRequestError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Media Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.InvalidRequest, description, options);
  }
}
