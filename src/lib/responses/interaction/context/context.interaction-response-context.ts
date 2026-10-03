/**
 * Parameters of the Context Interaction Response Context.
 */
export interface ContextInteractionResponseContext extends NodeJS.Dict<unknown> {
  /**
   * User's preferred languages and scripts for the User Interface.
   */
  readonly ui_locales?: string[];
}
