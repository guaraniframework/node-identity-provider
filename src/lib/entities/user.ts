/**
 * Base User Entity.
 */
export abstract class User implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the User.
   */
  public readonly id!: string;

  /**
   * Additional User Parameters.
   */
  [parameter: string]: unknown;
}
