import { DecisionInteractionRequest } from '../../../requests/interaction/decision/decision.interaction-request';
import { InteractionContext } from '../interaction-context';

/**
 * Parameters of the Decision Interaction Context.
 */
export interface DecisionInteractionContext<
  T extends DecisionInteractionRequest = DecisionInteractionRequest,
> extends InteractionContext<T> {}
