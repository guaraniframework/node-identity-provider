import { ConsentDecisionInteractionRequest } from './consent-decision.interaction-request';

/**
 * Parameters of the custom Consent Decision Accept Interaction Request.
 */
export interface ConsentDecisionAcceptInteractionRequest extends ConsentDecisionInteractionRequest<'accept'> {
  /**
   * Scope granted by the End User.
   */
  readonly granted_scope: string;
}
