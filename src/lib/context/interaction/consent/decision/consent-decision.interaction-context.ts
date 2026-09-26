import { Grant } from '../../../../entities/grant';
import { ConsentDecision } from '../../../../requests/interaction/consent/consent-decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/consent/consent-decision.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Consent Decision Interaction Context.
 */
export interface ConsentDecisionInteractionContext<
  TDecision extends ConsentDecision = ConsentDecision,
> extends InteractionContext<ConsentDecisionInteractionRequest<ConsentDecision>> {
  /**
   * Grant based on the Consent Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Decision regarding the Consent to the requested Scope.
   */
  readonly decision: TDecision;
}
