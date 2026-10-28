import { ContextInteractionRequest } from '../context-interaction-request';

/**
 * Parameters of the Consent Context Interaction Request.
 */
export interface ConsentContextInteractionRequest extends ContextInteractionRequest<'consent'> {
  /**
   * Consent Challenge provided by the Client.
   */
  readonly consent_challenge: string;
}
