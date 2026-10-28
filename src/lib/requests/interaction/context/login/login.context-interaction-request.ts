import { ContextInteractionRequest } from '../context-interaction-request';

/**
 * Parameters of the Login Context Interaction Request.
 */
export interface LoginContextInteractionRequest extends ContextInteractionRequest<'login'> {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
