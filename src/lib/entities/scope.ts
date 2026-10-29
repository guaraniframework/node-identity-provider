/**
 * Identity Provider Scope Entity.
 */
export class Scope implements NodeJS.Dict<unknown> {
  /**
   * Scope Identifier.
   */
  public readonly id!: string;

  /**
   * Scope Name.
   */
  public readonly name!: string;

  /**
   * Scope Description.
   */
  public description!: string | null;

  /**
   * Scope Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Scope Update Date.
   */
  public updatedAt!: Date;

  /**
   * Additional Scope Parameters.
   */
  [parameter: string]: unknown;
}
