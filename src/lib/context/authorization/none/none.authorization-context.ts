import { NoneAuthorizationRequest } from '../../../requests/authorization/none/none.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the None Authorization Context.
 */
export interface NoneAuthorizationContext extends AuthorizationContext {
  /**
   * Parameters of the None Authorization Request.
   */
  readonly parameters: NoneAuthorizationRequest;
}
