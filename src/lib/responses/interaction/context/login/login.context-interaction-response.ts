import { ContextInteractionResponse } from '../context-interaction-response';
import { LoginContextInteractionResponseContext } from './login.context-interaction-response-context';

/**
 * Parameters of the Login Context Interaction Response.
 */
export interface LoginContextInteractionResponse extends ContextInteractionResponse<LoginContextInteractionResponseContext> {
  /**
   * Indicates if the Application can skip displaying the Login Page.
   */
  readonly skip: boolean;
}
