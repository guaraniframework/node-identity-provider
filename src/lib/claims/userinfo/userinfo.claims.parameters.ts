import { AddressClaimParameters } from './address.claim.parameters';

/**
 * OpenID Connect Userinfo Claims.
 */
export interface UserinfoClaimsParameters extends NodeJS.Dict<unknown> {
  /**
   * Formatted Name of the User.
   */
  name?: string;

  /**
   * Given or First Name of the User.
   */
  given_name?: string;

  /**
   * Middle Name of the User.
   */
  middle_name?: string;

  /**
   * Family or Last Name of the User.
   */
  family_name?: string;

  /**
   * Casual Name of the User.
   */
  nickname?: string;

  /**
   * Shorthand Name that the User is referred to at the Relying Party.
   */
  preferred_username?: string;

  /**
   * URL of the Profile Page of the User.
   */
  profile?: string;

  /**
   * URL of the Picture of the User.
   */
  picture?: string;

  /**
   * URL of the Personal Website or Blog of the User.
   */
  website?: string;

  /**
   * Email Address of the User.
   */
  email?: string;

  /**
   * Informs the Relying Party whether or not the Email Address of the User has been verified.
   */
  email_verified?: boolean;

  /**
   * Gender of the User.
   */
  gender?: string;

  /**
   * Birthdate of the User in the format **YYYY-MM-DD**.
   */
  birthdate?: string;

  /**
   * Time Zone of the User.
   */
  zoneinfo?: string;

  /**
   * Locale of the User, represented as a BCP47 string.
   */
  locale?: string;

  /**
   * Phone Number of the User, represented as an E.164 string.
   */
  phone_number?: string;

  /**
   * Informs the Relying Party whether or not the Phone Number of the User has been verified.
   */
  phone_number_verified?: boolean;

  /**
   * Address of the User.
   */
  address?: AddressClaimParameters;

  /**
   * Time the information of the User was last updated, represented as Unix time.
   */
  updated_at?: number;
}
