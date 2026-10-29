import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the Identity Provider does not support the requested Interaction Type.
 */
export class UnsupportedInteractionTypeError extends IdentityProviderError {
  /**
   * Instantiates a new Unsupported Interaction Type Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.UnsupportedInteractionType, description, options);
  }
}
