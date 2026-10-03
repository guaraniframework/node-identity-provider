import { Grant } from '../../../../entities/grant';
import { ConsentDecision } from '../../../../requests/interaction/decision/consent/consent-decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision.interaction-request';
import { DecisionInteractionContext } from '../decision.interaction-context';

/**
 * Parameters of the Consent Decision Interaction Context.
 */
export interface ConsentDecisionInteractionContext<
  TDecision extends ConsentDecision = ConsentDecision,
> extends DecisionInteractionContext<ConsentDecisionInteractionRequest<ConsentDecision>> {
  /**
   * Grant based on the Consent Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Decision regarding the Consent to the requested Scope.
   */
  readonly decision: TDecision;
}
