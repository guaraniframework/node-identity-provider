import { JsonWebKey } from '@guarani/jose';

import { UserinfoClaimsParameters } from '../claims/userinfo/userinfo.claims.parameters';
import { AccessToken } from '../entities/access-token';
import { AuthorizationCode } from '../entities/authorization-code';
import { Client } from '../entities/client';
import { Consent } from '../entities/consent';
import { Grant } from '../entities/grant';
import { Login } from '../entities/login';
import { Session } from '../entities/session';
import { User } from '../entities/user';
import { AuthorizationRequest } from '../requests/authorization/authorization-request';
import { CodeAuthorizationRequest } from '../requests/authorization/code/code.authorization-request';

/**
 * Base class for the operations that need to interact with external systems.
 */
export abstract class DataAccess {
  /**
   * Creates an Access Token for authorized use by the Client.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Authorization.
   * @returns Issued Access Token.
   */
  public abstract createAccessToken(scopes: string[], client: Client, user: User | null): Promise<AccessToken>;

  /**
   * Creates an Access Token and an Authorization Code for authorized use by the Client.
   *
   * @param parameters Parameters of the Code Authorization Request.
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Tuple with the issued Access Token and Authorization Code.
   */
  public abstract createAccessTokenAndAuthorizationCode(
    parameters: CodeAuthorizationRequest,
    scopes: string[],
    client: Client,
    login: Login,
    consent: Consent,
  ): Promise<[AccessToken, AuthorizationCode]>;

  /**
   * Creates an Authorization Code to be exchanged by the Client at the Token Endpoint for an Access Token.
   *
   * @param parameters Parameters of the Code Authorization Request.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Issued Authorization Code.
   */
  public abstract createAuthorizationCode(
    parameters: CodeAuthorizationRequest,
    login: Login,
    consent: Consent,
  ): Promise<AuthorizationCode>;

  /**
   * Creates a Grant used to authenticate an User at the Identity Provider.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @param session Session containing the Logins for the User-Agent.
   * @returns Generated Grant.
   */
  public abstract createGrant(parameters: AuthorizationRequest, client: Client, session: Session): Promise<Grant>;

  /**
   * Creates a Session Entity to store the Sessions created at the Device for multi-account.
   *
   * @returns Newly created Session Entity.
   */
  public abstract createSession(): Promise<Session>;

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Identifier of the Client.
   * @returns Client based on the provided Identifier.
   */
  public abstract findClient(id: string): Promise<Client | null>;

  /**
   * Searches the application's storage for a Consent based on the provided Client and User.
   *
   * @param client Client requesting Consent.
   * @param user User granting Consent.
   * @returns Consent based on the provided Client and User.
   */
  public abstract findConsent(client: Client, user: User): Promise<Consent | null>;

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key ID.
   *
   * @param id JSON Web Key ID.
   * @returns JSON Web Key of the Identity Provider based on the provided Key ID.
   */
  public abstract findJsonWebKey(id: string): Promise<JsonWebKey | null>;

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Identifier of the Session.
   * @returns Session based on the provided Identifier.
   */
  public abstract findSession(id: string): Promise<Session | null>;

  /**
   * Searches the application's storage for a User containing the provided Identifier.
   *
   * @param id Identifier of the User.
   * @returns User based on the provided Identifier.
   */
  public abstract findUser(id: string): Promise<User | null>;

  /**
   * Retrieves the Wrap JSON Web Key of the Client.
   *
   * @param client Client of the Request.
   * @returns Wrap JSON Web key of the Client.
   */
  public abstract getClientWrapJsonWebKey?(client: Client): Promise<JsonWebKey>;

  /**
   * Gets the active Sign JSON Web Key of the Identity Provider.
   *
   * @returns Active Sign JSON Web Key of the Identity Provider.
   */
  public abstract getSignJsonWebKey(): Promise<JsonWebKey>;

  /**
   * Gets the active Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested ID Tokens.*
   *
   * @returns Active Unwrap JSON Web Key of the Identity Provider.
   */
  public abstract getUnwrapJsonWebKey?(): Promise<JsonWebKey>;

  /**
   * Retrieves claims about the provided User based on the provided scopes.
   *
   * @param user User to have its information gathered.
   * @param scopes Scopes requested by the Client.
   * @returns Claims about the provided User.
   */
  public abstract getUserinfo(user: User, scopes: string[]): Promise<UserinfoClaimsParameters>;

  /**
   * Logs out the Authenticated User represented by the provided Login.
   *
   * @param login Login to be removed.
   * @param session Session of the User-Agent.
   */
  public abstract logout(login: Login, session: Session): Promise<void>;

  /**
   * Removes the provided Consent.
   *
   * @param consent Consent to be removed.
   */
  public abstract removeConsent(consent: Consent): Promise<void>;

  /**
   * Removes the provided Grant.
   *
   * @param grant Grant to be removed.
   */
  public abstract removeGrant(grant: Grant): Promise<void>;

  /**
   * Inactivates the Active Login from the User-Agent's Session.
   *
   * This does not remove the actual Login from the storage,
   * only makes it inactive on the Session.
   *
   * @param session Session of the User-Agent.
   */
  public abstract inactivateSessionActiveLogin(session: Session): Promise<void>;
}
