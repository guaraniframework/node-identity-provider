import { InteractionTypeName } from '../interaction-types/interaction-type-name.type';
import { AuthorizationRequest } from '../requests/authorization/authorization-request';
import { Client } from './client';
import { Consent } from './consent';
import { Session } from './session';

/**
 * Identity Provider Grant Entity.
 */
export class Grant implements NodeJS.Dict<unknown> {
  /**
   * Grant Identifier.
   */
  public readonly id!: string;

  /**
   * Grant Login Challenge.
   */
  public readonly loginChallenge!: string;

  /**
   * Grant Consent Challenge.
   */
  public readonly consentChallenge!: string;

  /**
   * Authorization Request Parameters.
   */
  public readonly parameters!: AuthorizationRequest;

  /**
   * Interactions processed by the Identity Provider.
   */
  public readonly interactions!: Extract<InteractionTypeName, 'consent' | 'create' | 'login' | 'select_account'>[];

  /**
   * Grant Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Grant Expiration Date.
   */
  public readonly expiresAt!: Date;

  /**
   * Client requesting Authorization.
   */
  public readonly client!: Client;

  /**
   * Session for the User-Agent.
   */
  public readonly session!: Session;

  /**
   * Consent granted by the User.
   */
  public consent!: Consent | null;

  /**
   * Additional Grant Parameters.
   */
  [parameter: string]: unknown;
}
