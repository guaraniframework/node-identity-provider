import { ErrorCode } from '../../../../errors/error-code.type';
import { LoginDecisionInteractionRequest } from './login-decision.interaction-request';

/**
 * Parameters of the custom Login Decision Deny Interaction Request.
 */
export interface LoginDecisionDenyInteractionRequest extends LoginDecisionInteractionRequest<'deny'> {
  /**
   * Error Code.
   */
  readonly error: ErrorCode;

  /**
   * Description of the Error.
   */
  readonly error_description: string;
}
