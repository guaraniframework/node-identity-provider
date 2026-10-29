import { PKCEName } from './pkce-name.type';

/**
 * The PKCE is used to secure the Code Authorization Request with a Code Challenge that only the Client has access,
 * and if the Code Challenge changes between the Authorization Request and the Token Request, the Authorization Grant
 * is considered compromised and should be aborted.
 */
export abstract class PKCE {
  /**
   * Name of the PKCE.
   */
  public abstract readonly name: PKCEName;

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
