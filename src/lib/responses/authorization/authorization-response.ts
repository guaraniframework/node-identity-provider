/**
 * Definition of the Authorization Response.
 */
export interface AuthorizationResponse extends NodeJS.Dict<unknown> {
  /**
   * State of the Client prior to the Authorization Request.
   */
  state?: string;
}
