import { IdentityProviderError } from '../errors/identity-provider.error';
import { ErrorRequest } from '../requests/error-request';

/**
 * Definition of the Error Request Context.
 */
export interface ErrorRequestContext {
  /**
   * Parameters of the Error Request.
   */
  readonly parameters: ErrorRequest;

  /**
   * Identity Provider Error based on the provided Error Request.
   */
  readonly error: IdentityProviderError;
}
