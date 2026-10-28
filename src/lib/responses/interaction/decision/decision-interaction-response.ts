import { InteractionResponse } from '../interaction-response';

/**
 * Parameters of the Decision Interaction Response.
 */
export interface DecisionInteractionResponse extends InteractionResponse {
  /**
   * Redirect URL used by the User-Agent to continue the Authorization Process.
   */
  readonly redirect_to: string;
}
