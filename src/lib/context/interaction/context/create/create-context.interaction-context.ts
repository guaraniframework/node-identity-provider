import { Grant } from '../../../../entities/grant';
import { CreateContextInteractionRequest } from '../../../../requests/interaction/context/create/create-context.interaction-request';
import { ContextInteractionContext } from '../context.interaction-context';

/**
 * Parameters of the Create Context Interaction Context.
 */
export interface CreateContextInteractionContext extends ContextInteractionContext<CreateContextInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
