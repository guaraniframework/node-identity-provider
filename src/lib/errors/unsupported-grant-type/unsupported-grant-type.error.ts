import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider does not support the requested Grant Type.
 */
export class UnsupportedGrantTypeError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Grant Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnsupportedGrantType, description, options);
  }
}
