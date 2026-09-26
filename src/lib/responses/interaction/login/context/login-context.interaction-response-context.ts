import { DisplayName } from '../../../../displays/display-name.type';
import { Prompt } from '../../../../types/promt.type';

/**
 * Parameters of the Login Context Interaction Response Context.
 */
export interface LoginContextInteractionResponseContext extends NodeJS.Dict<unknown> {
  /**
   * Prompts requested by the Client.
   */
  readonly prompts?: Prompt[];

  /**
   * Display requested by the Client.
   */
  readonly display?: DisplayName;

  /**
   * Time after which the User Authentication violates the **max_age** Authorization Parameter.
   */
  readonly auth_exp?: number;

  /**
   * Hint about the Identifier that the User might use for authentication.
   */
  readonly login_hint?: string;

  /**
   * User's preferred languages and scripts for the User Interface.
   */
  readonly ui_locales?: string[];

  /**
   * Authentication Context Class References requested by the Client in order of preference.
   */
  readonly acr_values?: string[];
}
