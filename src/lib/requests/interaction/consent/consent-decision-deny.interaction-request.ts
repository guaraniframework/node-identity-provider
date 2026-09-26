import { ConsentDecisionInteractionRequest } from './consent-decision.interaction-request';

/**
 * Parameters of the custom Consent Deny Decision Interaction Request.
 */
export interface ConsentDecisionDenyInteractionRequest extends ConsentDecisionInteractionRequest<'deny'> {
  /**
   * Error Code.
   */
  readonly error: string;

  /**
   * Description of the Error.
   */
  readonly error_description: string;
}
