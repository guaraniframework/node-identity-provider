import { Grant } from './grant';
import { Login } from './login';

/**
 * Base Session Entity.
 */
export abstract class Session implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the Session.
   */
  public readonly id!: string;

  /**
   * Currently active Login.
   */
  public activeLogin!: Login | null;

  /**
   * Logins created within the Session.
   */
  public logins!: Login[];

  /**
   * Grant of the current Authorization process.
   */
  public grant!: Grant | null;

  /**
   * Additional Session Parameters.
   */
  [parameter: string]: unknown;
}
