/**
 * Parameters of the Authorization Response.
 */
export interface AuthorizationResponse extends NodeJS.Dict<string | number | boolean | null> {
  /**
   * State of the Client prior to the Authorization Request.
   */
  state?: string;
}
