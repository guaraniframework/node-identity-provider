import { Grant } from '../../../../entities/grant';
import { SelectAccountContextInteractionRequest } from '../../../../requests/interaction/context/select-account/select-account-context.interaction-request';
import { ContextInteractionContext } from '../context.interaction-context';

/**
 * Parameters of the Select Account Context Interaction Context.
 */
export interface SelectAccountContextInteractionContext extends ContextInteractionContext<SelectAccountContextInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
