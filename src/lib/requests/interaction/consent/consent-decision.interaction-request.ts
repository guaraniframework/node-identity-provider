import { InteractionRequest } from '../interaction-request';
import { ConsentDecision } from './consent-decision';

/**
 * Parameters of the custom Consent Decision Interaction Request.
 */
export interface ConsentDecisionInteractionRequest<
  T extends ConsentDecision = ConsentDecision,
> extends InteractionRequest {
  /**
   * Consent Challenge provided by the Client.
   */
  readonly consent_challenge: string;

  /**
   * Decision regarding the Consent to the requested Scope.
   */
  readonly decision: T;
}
