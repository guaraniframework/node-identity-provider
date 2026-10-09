import { ErrorCode } from '../error-code.enum';
import { IdentityProviderError } from '../identity-provider.error';
import { IdentityProviderErrorOptions } from '../identity-provider-error.options';

/**
 * Raised when the requested Endpoint exists in the Identity Provider
 * but does not support the requested Http Request Method.
 */
export class MethodNotAllowedError extends IdentityProviderError {
  /**
   * Instantiates a new Method Not Allowed Error.
   *
   * @param description Error Description.
   * @param options Error Options.
   */
  public constructor(description: string, options?: IdentityProviderErrorOptions) {
    super(ErrorCode.MethodNotAllowed, description, options);
    this.setHttpStatus(405);
  }
}
