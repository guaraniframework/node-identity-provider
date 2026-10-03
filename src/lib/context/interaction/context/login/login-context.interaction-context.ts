import { Grant } from '../../../../entities/grant';
import { LoginContextInteractionRequest } from '../../../../requests/interaction/context/login/login-context.interaction-request';
import { ContextInteractionContext } from '../context.interaction-context';

/**
 * Parameters of the Login Context Interaction Context.
 */
export interface LoginContextInteractionContext extends ContextInteractionContext<LoginContextInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
