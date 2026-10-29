import { ConsentDecisionInteractionRequest } from './consent.decision-interaction-request';

/**
 * Parameters of the Consent Deny Decision Interaction Request.
 */
export interface ConsentDenyDecisionInteractionRequest extends ConsentDecisionInteractionRequest<'deny'> {
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
