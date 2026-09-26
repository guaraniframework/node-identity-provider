import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the custom Select Account Decision Interaction Request.
 */
export interface SelectAccountDecisionInteractionRequest extends InteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;

  /**
   * Identifier of the Login.
   */
  readonly login_id: string;
}
