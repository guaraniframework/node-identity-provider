/**
 * Identity Provider User Address Entity.
 */
export class UserAddress implements NodeJS.Dict<unknown> {
  /**
   * User Address Identifier.
   */
  public readonly id!: string;

  /**
   * Full Mailing Address.
   */
  public readonly formatted!: string | null;

  /**
   * Full Street Address.
   */
  public streetAddress!: string | null;

  /**
   * City or Locality.
   */
  public locality!: string | null;

  /**
   * State, Province, Prefecture or Region.
   */
  public region!: string | null;

  /**
   * Zip Code or Postal Code.
   */
  public postalCode!: string | null;

  /**
   * Country.
   */
  public country!: string | null;

  /**
   * Additional User Address Parameters.
   */
  [parameter: string]: unknown;
}
