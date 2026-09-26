import { DisplayName } from '../../../../displays/display-name.type';
import { Prompt } from '../../../../types/promt.type';

/**
 * Parameters of the Select Account Context Interaction Response Context.
 */
export interface SelectAccountContextInteractionResponseContext extends NodeJS.Dict<unknown> {
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
