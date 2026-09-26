import { Grant } from '../../../../entities/grant';
import { CreateContextInteractionRequest } from '../../../../requests/interaction/create/create-context.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Create Context Interaction Context.
 */
export interface CreateContextInteractionContext extends InteractionContext<CreateContextInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
