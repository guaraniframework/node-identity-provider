import { DisplayName } from '../../../../displays/display-name.type';
import { Prompt } from '../../../../types/promt.type';

/**
 * Parameters of the Create Context Interaction Response Context.
 */
export interface CreateContextInteractionResponseContext extends NodeJS.Dict<unknown> {
  /**
   * Prompts requested by the Client.
   */
  readonly prompts?: Prompt[];

  /**
   * Display requested by the Client.
   */
  readonly display?: DisplayName;

  /**
   * User's preferred languages and scripts for the User Interface.
   */
  readonly ui_locales?: string[];
}
