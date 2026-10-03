import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the custom Context Interaction Request.
 */
export interface ContextInteractionRequest extends InteractionRequest {
  /**
   * Identifier of the Client of the Interaction Request.
   */
  readonly client_id: string;
}
