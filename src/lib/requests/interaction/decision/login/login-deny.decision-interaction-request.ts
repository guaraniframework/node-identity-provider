import { LoginDecisionInteractionRequest } from './login.decision-interaction-request';

/**
 * Parameters of the Login Deny Decision Interaction Request.
 */
export interface LoginDenyDecisionInteractionRequest extends LoginDecisionInteractionRequest<'deny'> {
  /**
   * Error Code.
   */
  readonly error: string;

  /**
   * Description of the Error.
   */
  readonly error_description: string;

  /**
   * URI of the Page containing the details of the Error.
   */
  readonly error_uri?: string;
}
