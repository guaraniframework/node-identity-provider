import { InteractionTypeName } from '../interaction-types/interaction-type-name.type';
import { AuthorizationRequest } from '../requests/authorization/authorization-request';
import { Client } from './client';
import { Consent } from './consent';
import { Session } from './session';

/**
 * Base Grant Entity.
 */
export abstract class Grant implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the Grant.
   */
  public readonly id!: string;

  /**
   * Login Challenge of the Grant.
   */
  public readonly loginChallenge!: string;

  /**
   * Consent Challenge of the Grant.
   */
  public readonly consentChallenge!: string;

  /**
   * Parameters of the Authorization Request.
   */
  public readonly parameters!: AuthorizationRequest;

  /**
   * Interactions processed by the Identity Provider.
   */
  public readonly interactions!: InteractionTypeName[];

  /**
   * Creation Date of the Grant.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Grant.
   */
  public readonly expiresAt!: Date;

  /**
   * Client requesting authorization.
   */
  public readonly client!: Client;

  /**
   * Session for the User-Agent.
   */
  public readonly session!: Session;

  /**
   * End User Consent.
   */
  public consent!: Consent | null;

  /**
   * Additional Grant Parameters.
   */
  [parameter: string]: unknown;
}
