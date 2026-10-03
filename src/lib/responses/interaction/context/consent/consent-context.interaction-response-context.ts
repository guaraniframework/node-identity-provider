import { DisplayName } from '../../../../displays/display-name.type';
import { Prompt } from '../../../../types/promt.type';
import { ContextInteractionResponseContext } from '../context.interaction-response-context';

/**
 * Parameters of the Consent Context Interaction Response Context.
 */
export interface ConsentContextInteractionResponseContext extends ContextInteractionResponseContext {
  /**
   * Prompts requested by the Client.
   */
  readonly prompts?: Prompt[];

  /**
   * Display requested by the Client.
   */
  readonly display?: DisplayName;
}
