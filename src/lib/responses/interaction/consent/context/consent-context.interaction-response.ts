import { ContextInteractionResponse } from '../../context.interaction-response';
import { ConsentContextInteractionResponseContext } from './consent-context.interaction-response-context';

/**
 * Parameters of the custom Consent Context Interaction Response.
 */
export interface ConsentContextInteractionResponse extends ContextInteractionResponse<ConsentContextInteractionResponseContext> {
  /**
   * Indicates if the Application can skip displaying the Consent Screen.
   */
  readonly skip: boolean;

  /**
   * Scope requested by the Client.
   */
  readonly requested_scope: string;

  /**
   * Identifier of the Subject of the Authentication.
   */
  readonly subject_id: string;

  /**
   * Request Url.
   */
  readonly request_url: string;

  /**
   * Login Challenge of the Grant.
   */
  readonly login_challenge: string;

  /**
   * Identifier of the Client requesting authorization.
   */
  readonly client_id: string;
}
