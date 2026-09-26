import { Grant } from '../../../../entities/grant';
import { CreateDecisionInteractionRequest } from '../../../../requests/interaction/create/create-decision.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Create Decision Interaction Context.
 */
export interface CreateDecisionInteractionContext extends InteractionContext<CreateDecisionInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
