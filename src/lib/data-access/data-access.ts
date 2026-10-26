import { JsonWebKey } from '@guarani/jose';

import { UserinfoClaimsParameters } from '../claims/userinfo/userinfo.claims.parameters';
import { AccessToken } from '../entities/access-token';
import { AuthorizationCode } from '../entities/authorization-code';
import { Client } from '../entities/client';
import { Consent } from '../entities/consent';
import { Login } from '../entities/login';
import { Scope } from '../entities/scope';
import { Session } from '../entities/session';
import { User } from '../entities/user';
import { PKCE } from '../pkces/pkce';

/**
 * The Data Access is used for the operations of the Identity Provider that need to interact with external systems.
 */
export abstract class DataAccess {
  /**
   * Runs the provided sequence of operations as an atomic operation.
   *
   * @param operations Contains the sequence of operations to be run as an atomic operation.
   * @returns Returns the result of the Operations function.
   */
  public abstract atomic<T>(operations: () => Promise<T>): Promise<T>;

  /**
   * Creates an Access Token for authorized use by the Client.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Authorization.
   * @returns Created Access Token.
   */
  public abstract createAccessToken(scopes: Scope[], client: Client, user: User | null): Promise<AccessToken>;

  /**
   * Creates an Authorization Code to be exchanged by the Client at the Token Endpoint for an Access Token.
   *
   * @param codeChallenge PKCE Code Challenge.
   * @param codeChallengeMethod PKCE Code Challenge Method.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Created Authorization Code.
   */
  public abstract createAuthorizationCode(
    codeChallenge: string,
    codeChallengeMethod: PKCE,
    login: Login,
    consent: Consent,
  ): Promise<AuthorizationCode>;

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Client Identifier.
   * @returns Client based on the provided Identifier.
   */
  public abstract findClientById(id: string): Promise<Client | null>;

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key Identifier.
   *
   * @param id JSON Web Key Identifier.
   * @returns JSON Web Key of the Identity Provider based on the provided Key Identifier.
   */
  public abstract findJsonWebKeyByKeyId?(id: string): Promise<JsonWebKey | null>;

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Session Identifier.
   * @returns Session based on the provided Identifier.
   */
  public abstract findSessionById(id: string): Promise<Session | null>;

  /**
   * Searches the application's storage for a User containing the provided Identifier.
   *
   * @param id User Identifier.
   * @returns User based on the provided Identifier.
   */
  public abstract findUserById(id: string): Promise<User | null>;

  /**
   * Retrieves the Wrap JSON Web Key of the Client.
   *
   * @param client Client of the Request.
   * @throws {InvalidClientError} Failed to get a Wrap JSON Web Key from the Client's JSON Web Key Set.
   * @returns Wrap JSON Web key of the Client.
   */
  public abstract getClientWrapJsonWebKey?(client: Client): Promise<JsonWebKey>;

  /**
   * Returns the Scopes of the application's storage.
   *
   * @returns Scopes of the application's storage.
   */
  public abstract getScopes(): Promise<Scope[]>;

  /**
   * Returns the Scopes requested from the application's storage.
   *
   * @param scopes Scopes requested by the Client.
   * @returns Scopes requested from the application's storage.
   */
  public abstract getScopesByName(scopes: string[]): Promise<Scope[]>;

  /**
   * Gets the active Sign JSON Web Key of the Identity Provider.
   *
   * @returns Active Sign JSON Web Key of the Identity Provider.
   */
  public abstract getSignJsonWebKey?(): Promise<JsonWebKey>;

  /**
   * Gets the active Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested ID Tokens.*
   *
   * @returns Active Unwrap JSON Web Key of the Identity Provider.
   */
  public abstract getUnwrapJsonWebKey?(): Promise<JsonWebKey>;

  /**
   * Retrieves the claims of the provided User based on the provided Scopes.
   *
   * @param user User to have its information gathered.
   * @param scopes Scopes requested by the Client.
   * @returns Claims about the provided User.
   */
  public abstract getUserinfo?(user: User, scopes: Scope[]): Promise<UserinfoClaimsParameters>;
}
