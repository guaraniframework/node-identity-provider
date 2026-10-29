/**
 * Identity Provider Client Secret Entity.
 */
export class ClientSecret implements NodeJS.Dict<unknown> {
  /**
   * Client Secret Identifier.
   */
  public readonly id!: string;

  /**
   * Client Secret Value.
   */
  public readonly secret!: string;

  /**
   * Client Secret Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Client Secret Expiration Date.
   */
  public readonly expiresAt!: Date;

  /**
   * Additional Client Secret Parameters.
   */
  [parameter: string]: unknown;
}
