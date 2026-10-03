/**
 * Parameters of the Client Secret Post Client Authentication Method.
 */
export interface ClientSecretPostClientAuthenticationParameters extends NodeJS.Dict<string> {
  /**
   * Client Identifier.
   */
  readonly client_id: string;

  /**
   * Client Secret.
   */
  readonly client_secret: string;
}
