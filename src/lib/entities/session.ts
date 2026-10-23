import { Grant } from './grant';
import { Login } from './login';

/**
 * Identity Provider Session Entity.
 */
export class Session implements NodeJS.Dict<unknown> {
  /**
   * Session Identifier.
   */
  public readonly id!: string;

  /**
   * Currently active Login.
   */
  public activeLogin!: Login | null;

  /**
   * Logins created within the Session.
   */
  public readonly logins!: Login[];

  /**
   * Grant of the current Authorization process.
   */
  public grant!: Grant | null;

  /**
   * Additional Session Parameters.
   */
  [parameter: string]: unknown;
}
