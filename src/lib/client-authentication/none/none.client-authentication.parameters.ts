/**
 * Parameters of the None Client Authentication Method.
 */
export interface NoneClientAuthenticationParameters extends NodeJS.Dict<string> {
  /**
   * Client Identifier.
   */
  readonly client_id: string;

  /**
   * ~Client Secret.~
   */
  readonly client_secret?: never;
}
