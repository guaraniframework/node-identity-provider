import { DecisionInteractionRequest } from '../decision.interaction-request';

/**
 * Parameters of the custom Create Decision Interaction Request.
 */
export interface CreateDecisionInteractionRequest extends DecisionInteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
