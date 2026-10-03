import { ContextInteractionRequest } from '../context.interaction-request';

/**
 * Parameters of the custom Consent Context Interaction Request.
 */
export interface ConsentContextInteractionRequest extends ContextInteractionRequest {
  /**
   * Consent Challenge provided by the Client.
   */
  readonly consent_challenge: string;
}
