import { DecisionInteractionRequest } from '../decision-interaction-request';

/**
 * Parameters of the Create Decision Interaction Request.
 */
export interface CreateDecisionInteractionRequest extends DecisionInteractionRequest<'create'> {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;

  /**
   * User Registration Parameters.
   */
  readonly [parameter: string]: string;
}
