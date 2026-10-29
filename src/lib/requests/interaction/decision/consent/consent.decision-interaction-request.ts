import { DecisionInteractionRequest } from '../decision-interaction-request';
import { ConsentDecision } from './consent.decision';

/**
 * Parameters of the Consent Decision Interaction Request.
 */
export interface ConsentDecisionInteractionRequest<
  TDecision extends ConsentDecision = ConsentDecision,
> extends DecisionInteractionRequest<'consent'> {
  /**
   * Consent Challenge provided by the Client.
   */
  readonly consent_challenge: string;

  /**
   * Decision regarding the Consent to the requested Scope.
   */
  readonly decision: TDecision;
}
