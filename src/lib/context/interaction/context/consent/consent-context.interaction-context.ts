import { Grant } from '../../../../entities/grant';
import { ConsentContextInteractionRequest } from '../../../../requests/interaction/context/consent/consent-context.interaction-request';
import { ContextInteractionContext } from '../context.interaction-context';

/**
 * Parameters of the Consent Context Interaction Context.
 */
export interface ConsentContextInteractionContext extends ContextInteractionContext<ConsentContextInteractionRequest> {
  /**
   * Grant based on the Consent Challenge provided by the Client.
   */
  readonly grant: Grant;
}
