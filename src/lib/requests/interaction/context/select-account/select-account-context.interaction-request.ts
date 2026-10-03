import { ContextInteractionRequest } from '../context.interaction-request';

/**
 * Parameters of the custom Select Account Context Interaction Request.
 */
export interface SelectAccountContextInteractionRequest extends ContextInteractionRequest {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
