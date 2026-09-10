/**
 * Base Client Secret Entity.
 */
export abstract class ClientSecret implements NodeJS.Dict<unknown> {
  /**
   * Client Secret Value.
   */
  public readonly secret!: string;

  /**
   * Creation Date of the Client Secret.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Client Secret.
   */
  public readonly expiresAt!: Date;

  /**
   * Additional Client Secret Parameters.
   */
  [parameter: string]: unknown;
}
