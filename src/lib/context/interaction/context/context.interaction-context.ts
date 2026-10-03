import { ContextInteractionRequest } from '../../../requests/interaction/context/context.interaction-request';
import { InteractionContext } from '../interaction-context';

/**
 * Parameters of the Context Interaction Context.
 */
export interface ContextInteractionContext<
  T extends ContextInteractionRequest = ContextInteractionRequest,
> extends InteractionContext<T> {}
