import { ContextInteractionRequest } from '../context-interaction-request';

/**
 * Parameters of the Select Account Context Interaction Request.
 */
export interface SelectAccountContextInteractionRequest extends ContextInteractionRequest<'select_account'> {
  /**
   * Login Challenge provided by the Client.
   */
  readonly login_challenge: string;
}
