import { ConsentDecisionInteractionRequest } from './consent.decision-interaction-request';

/**
 * Parameters of the Consent Accept Decision Interaction Request.
 */
export interface ConsentAcceptDecisionInteractionRequest extends ConsentDecisionInteractionRequest<'accept'> {
  /**
   * Scope granted by the User.
   */
  readonly granted_scope: string;
}
