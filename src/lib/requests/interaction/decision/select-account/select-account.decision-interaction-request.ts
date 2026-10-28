import { DecisionInteractionRequest } from '../decision-interaction-request';

/**
 * Parameters of the Select Account Decision Interaction Request.
 */
export interface SelectAccountDecisionInteractionRequest extends DecisionInteractionRequest<'select_account'> {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;

  /**
   * Login Identifier.
   */
  readonly login_id: string;
}
