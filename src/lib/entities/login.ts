import { Client } from './client';
import { Session } from './session';
import { User } from './user';

/**
 * Identity Provider Login Entity.
 */
export class Login implements NodeJS.Dict<unknown> {
  /**
   * Login Identifier.
   */
  public readonly id!: string;

  /**
   * Authentication Methods used in the Authentication.
   */
  public readonly amr!: string[];

  /**
   * Authentication Context Class Reference satisfied by the Authentication process.
   */
  public readonly acr!: string | null;

  /**
   * Login Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Login Expiration Date.
   *
   * *note: a null value indicates that the login does not expire.*
   */
  public readonly expiresAt!: Date | null;

  /**
   * Authenticated User.
   */
  public readonly user!: User;

  /**
   * Session to which the Login was created.
   */
  public readonly session!: Session;

  /**
   * Clients that were Authorized by this Login.
   */
  public readonly clients!: Client[];

  /**
   * Additional Login Parameters.
   */
  [parameter: string]: unknown;
}
