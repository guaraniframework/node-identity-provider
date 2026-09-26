import { Grant } from '../../../../entities/grant';
import { SelectAccountContextInteractionRequest } from '../../../../requests/interaction/select-account/select-account-context.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Select Account Context Interaction Context.
 */
export interface SelectAccountContextInteractionContext extends InteractionContext<SelectAccountContextInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;
}
