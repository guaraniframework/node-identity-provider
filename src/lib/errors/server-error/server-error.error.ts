import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider encounters an unexpected error.
 */
export class ServerErrorError extends IdentityProviderError {
  /**
   * Instantiates a new Server Error Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.ServerError, description, options);
    this.setHttpStatus(500);
  }
}
