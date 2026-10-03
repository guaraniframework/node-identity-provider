import { ErrorCode } from '../../../../errors/error-code.type';
import { ConsentDecisionInteractionRequest } from './consent-decision.interaction-request';

/**
 * Parameters of the custom Consent Decision Deny Interaction Request.
 */
export interface ConsentDecisionDenyInteractionRequest extends ConsentDecisionInteractionRequest<'deny'> {
  /**
   * Error Code.
   */
  readonly error: ErrorCode;

  /**
   * Description of the Error.
   */
  readonly error_description: string;
}
