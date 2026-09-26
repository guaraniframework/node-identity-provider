/**
 * Parameters of the Select Account Decision Interaction Response.
 */
export interface SelectAccountDecisionInteractionResponse extends NodeJS.Dict<unknown> {
  /**
   * Redirect URL used by the User-Agent to continue the Authorization Process.
   */
  readonly redirect_to: string;
}
