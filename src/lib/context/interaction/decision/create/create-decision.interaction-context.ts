import { Grant } from '../../../../entities/grant';
import { CreateDecisionInteractionRequest } from '../../../../requests/interaction/decision/create/create-decision.interaction-request';
import { DecisionInteractionContext } from '../decision.interaction-context';

/**
 * Parameters of the Create Decision Interaction Context.
 */
export interface CreateDecisionInteractionContext extends DecisionInteractionContext<CreateDecisionInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Parameters of the User to be registered.
   */
  readonly data: NodeJS.Dict<unknown>;
}
