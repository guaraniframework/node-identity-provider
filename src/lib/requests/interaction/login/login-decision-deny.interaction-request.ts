import { LoginDecisionInteractionRequest } from './login-decision.interaction-request';

/**
 * Parameters of the custom Login Deny Decision Interaction Request.
 */
export interface LoginDecisionDenyInteractionRequest extends LoginDecisionInteractionRequest<'deny'> {
  /**
   * Error Code.
   */
  readonly error: string;

  /**
   * Description of the Error.
   */
  readonly error_description: string;
}
