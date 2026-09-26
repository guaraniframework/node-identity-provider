import { InteractionRequest } from '../interaction-request';
import { LoginDecision } from './login-decision';

/**
 * Parameters of the custom Login Decision Interaction Request.
 */
export interface LoginDecisionInteractionRequest<
  TDecision extends LoginDecision = LoginDecision,
> extends InteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;

  /**
   * Decision regarding the User Authentication.
   */
  readonly decision: TDecision;
}
