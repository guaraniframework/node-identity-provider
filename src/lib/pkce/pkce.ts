import { PkceName } from './pkce-name.type';

/**
 * Base class of a Proof Key for Code Exchange.
 */
export abstract class Pkce {
  /**
   * Name of the PKCE.
   */
  public abstract readonly name: PkceName;

  /**
   * Checks if the Authorization Code Verifier provided by the Client at the Token Endpoint
   * matches the Authorization Code Challenge provided at the Authorization Endpoint.
   *
   * @param challenge Authorization Code Challenge provided at the Authorization Endpoint.
   * @param verifier Authorization Code Verifier provided at the Token Endpoint.
   * @returns Whether or not the Challenge and Verifier match.
   */
  public abstract verify(challenge: string, verifier: string): boolean;
}
