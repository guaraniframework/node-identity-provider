import { ContextInteractionRequest } from '../context-interaction-request';

/**
 * Parameters of the Create Context Interaction Request.
 */
export interface CreateContextInteractionRequest extends ContextInteractionRequest<'create'> {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
