import { ContextInteractionRequest } from '../context.interaction-request';

/**
 * Parameters of the custom Create Context Interaction Request.
 */
export interface CreateContextInteractionRequest extends ContextInteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
