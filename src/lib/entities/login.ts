import { Client } from './client';
import { Session } from './session';
import { User } from './user';

/**
 * Base Login Entity.
 */
export abstract class Login implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the Login.
   */
  public readonly id!: string;

  /**
   * Authentication Methods used in the Authentication.
   */
  public readonly amr!: string[] | null;

  /**
   * Authentication Context Class Reference satisfied by the Authentication process.
   */
  public readonly acr!: string | null;

  /**
   * Creation Date of the Login.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Login.
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
   * Clients that were authorized by this Login.
   */
  public readonly clients!: Client[];

  /**
   * Additional Login Parameters.
   */
  [parameter: string]: unknown;
}
