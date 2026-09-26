/**
 * Parameters of the Consent Decision Interaction Response.
 */
export interface ConsentDecisionInteractionResponse extends NodeJS.Dict<unknown> {
  /**
   * Redirect URL used by the User-Agent to continue the Authorization Process.
   */
  readonly redirect_to: string;
}
