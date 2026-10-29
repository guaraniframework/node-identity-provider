/**
 * Parameters of the OpenID Connect's Userinfo Address Claim.
 */
export interface AddressClaimParameters extends NodeJS.Dict<unknown> {
  /**
   * Formatted Address of the User.
   */
  formatted?: string;

  /**
   * Street Address of the User.
   */
  street_address?: string;

  /**
   * City or locality of the User.
   */
  locality?: string;

  /**
   * State, province, prefecture of region of the User.
   */
  region?: string;

  /**
   * Zip code or Postal code of the User.
   */
  postal_code?: string;

  /**
   * Country of the User.
   */
  country?: string;
}
