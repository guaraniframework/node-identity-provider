import { ContextInteractionResponse } from '../../context.interaction-response';
import { SelectAccountContextInteractionResponseContext } from './select-account-context.interaction-response-context';

/**
 * Parameters of the custom Select Account Context Interaction Response.
 */
export interface SelectAccountContextInteractionResponse extends ContextInteractionResponse<SelectAccountContextInteractionResponseContext> {
  /**
   * Logins Identifiers registered within the User-Agent's connection to the Identity Provider.
   */
  readonly logins_ids: string[];
}
