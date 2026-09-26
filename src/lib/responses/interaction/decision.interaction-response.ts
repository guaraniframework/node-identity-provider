/**
 * Parameters of the Decision Interaction Response.
 */
export interface DecisionInteractionResponse extends NodeJS.Dict<unknown> {
  /**
   * Redirect URL used by the User-Agent to continue the Authorization Process.
   */
  readonly redirect_to: string;
}
