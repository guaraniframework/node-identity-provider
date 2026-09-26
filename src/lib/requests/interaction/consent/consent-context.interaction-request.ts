import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the custom Consent Context Interaction Request.
 */
export interface ConsentContextInteractionRequest extends InteractionRequest {
  /**
   * Consent Challenge provided by the Client.
   */
  readonly consent_challenge: string;
}
