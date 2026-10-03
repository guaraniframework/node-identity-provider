import { ContextInteractionRequest } from '../context.interaction-request';

/**
 * Parameters of the custom Login Context Interaction Request.
 */
export interface LoginContextInteractionRequest extends ContextInteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
