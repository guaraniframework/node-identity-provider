import { Grant } from '../../../../entities/grant';
import { ConsentContextInteractionRequest } from '../../../../requests/interaction/consent/consent-context.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Consent Context Interaction Context.
 */
export interface ConsentContextInteractionContext extends InteractionContext<ConsentContextInteractionRequest> {
  /**
   * Grant based on the Consent Challenge provided by the Client.
   */
  readonly grant: Grant;
}
