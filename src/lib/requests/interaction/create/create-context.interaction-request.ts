import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the custom Create Context Interaction Request.
 */
export interface CreateContextInteractionRequest extends InteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
