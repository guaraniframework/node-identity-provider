import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider does not support the requested Response Type.
 */
export class UnsupportedResponseTypeError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Response Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnsupportedResponseType, description, options);
  }
}
