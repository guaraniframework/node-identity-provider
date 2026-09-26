import { ContextInteractionResponse } from '../../context.interaction-response';
import { LoginContextInteractionResponseContext } from './login-context.interaction-response-context';

/**
 * Parameters of the custom Login Context Interaction Response.
 */
export interface LoginContextInteractionResponse extends ContextInteractionResponse<LoginContextInteractionResponseContext> {
  /**
   * Indicates if the Application can skip displaying the Login Page.
   */
  readonly skip: boolean;

  /**
   * Request Url.
   */
  readonly request_url: string;

  /**
   * Identifier of the Client requesting authorization.
   */
  readonly client_id: string;
}
