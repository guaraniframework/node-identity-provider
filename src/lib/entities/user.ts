import { URL } from 'url';

import { UserAddress } from './user-address';

/**
 * Identity Provider User Entity.
 */
export class User implements NodeJS.Dict<unknown> {
  /**
   * User Identifier.
   */
  public readonly id!: string;

  /**
   * User Full Name.
   */
  public name!: string | null;

  /**
   * User Given Name.
   */
  public givenName!: string | null;

  /**
   * User Middle Name.
   */
  public middleName!: string | null;

  /**
   * User Family Name.
   */
  public familyName!: string | null;

  /**
   * User Nickname.
   */
  public nickname!: string | null;

  /**
   * User Preferred Username.
   */
  public preferredUsername!: string | null;

  /**
   * User Profile URL.
   */
  public profile!: URL | null;

  /**
   * User Picture URL.
   */
  public picture!: URL | null;

  /**
   * User Personal Website URL.
   */
  public website!: URL | null;

  /**
   * User Email.
   */
  public email!: string | null;

  /**
   * User Email Verified.
   */
  public emailVerified!: boolean | null;

  /**
   * User Gender.
   */
  public gender!: string | null;

  /**
   * User Birthdate.
   */
  public birthdate!: string | null;

  /**
   * User Time Zone.
   */
  public zoneinfo!: string | null;

  /**
   * User Locale.
   */
  public locale!: string | null;

  /**
   * User Phone Number.
   */
  public phoneNumber!: string | null;

  /**
   * User Phone Number Verified.
   */
  public phoneNumberVerified!: boolean | null;

  /**
   * User Preferred Postal Address.
   */
  public address!: UserAddress | null;

  /**
   * User Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * User Update Date.
   */
  public updatedAt!: Date;

  /**
   * Additional User Parameters.
   */
  [parameter: string]: unknown;
}
