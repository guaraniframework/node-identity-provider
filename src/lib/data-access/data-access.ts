import { JsonWebKey } from '@guarani/jose';

import { UserinfoClaimsParameters } from '../claims/userinfo/userinfo.claims.parameters';
import { AccessToken } from '../entities/access-token';
import { AuthorizationCode } from '../entities/authorization-code';
import { Client } from '../entities/client';
import { Consent } from '../entities/consent';
import { Grant } from '../entities/grant';
import { Login } from '../entities/login';
import { RefreshToken } from '../entities/refresh-token';
import { Scope } from '../entities/scope';
import { Session } from '../entities/session';
import { User } from '../entities/user';
import { AuthorizationRequest } from '../requests/authorization/authorization-request';

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
   * @param parameters Parameters of the Authorization Request.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Created Authorization Code.
   */
  public abstract createAuthorizationCode(
    parameters: AuthorizationRequest,
    login: Login,
    consent: Consent,
  ): Promise<AuthorizationCode>;

  /**
   * Creates a Consent for the Client and the User of the Active Login.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Consent.
   * @returns Created Consent.
   */
  public abstract createConsent(scopes: Scope[], client: Client, user: User): Promise<Consent>;

  /**
   * Creates a Grant used to authenticate an User at the Identity Provider.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @param session Session containing the Logins for the User-Agent.
   * @returns Created Grant.
   */
  public abstract createGrant(parameters: AuthorizationRequest, client: Client, session: Session): Promise<Grant>;

  /**
   * Authenticates the provided User and saves its Login to the Session of the Grant.
   *
   * @param user User to be Authenticated.
   * @param client Client requesting Authorization.
   * @param session Session where the Login will be recorded.
   * @param amr Authentication Methods used in the Authentication.
   * @param acr Authentication Context Class Reference satisfied by the Authentication Process.
   */
  public abstract createLogin(
    user: User,
    client: Client,
    session: Session,
    amr: string[],
    acr: string | null,
  ): Promise<Login>;

  /**
   * Creates a Refresh Token for authorized use by the Client.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Authorization.
   * @returns Created Refresh Token.
   */
  public abstract createRefreshToken?(scopes: Scope[], client: Client, user: User): Promise<RefreshToken>;

  /**
   * Creates a Session Entity to store the Sessions created at the Device for multi-account.
   *
   * @returns Newly created Session Entity.
   */
  public abstract createSession(): Promise<Session>;

  /**
   * Creates a new User based on the provided data.
   *
   * @param data Data of the User to be registered.
   * @returns Created User.
   */
  public abstract createUser(data: NodeJS.Dict<string>): Promise<User>;

  /**
   * Searches the application's storage for an Access Token containing the provided Identifier.
   *
   * @param id Access Token Identifier.
   * @returns Access Token based on the provided Identifier.
   */
  public abstract findAccessTokenById(id: string): Promise<AccessToken | null>;

  /**
   * Searches the application's storage for an Authorization Code containing the provided Identifier.
   *
   * @param id Authorization Code Identifier.
   * @returns Authorization Code based on the provided Identifier.
   */
  public abstract findAuthorizationCodeById(id: string): Promise<AuthorizationCode | null>;

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Client Identifier.
   * @returns Client based on the provided Identifier.
   */
  public abstract findClientById(id: string): Promise<Client | null>;

  /**
   * Searches the application's storage for a Consent based on the provided Client and User.
   *
   * @param client Client requesting Consent.
   * @param user User granting Consent.
   * @returns Consent based on the provided Client and User.
   */
  public abstract findConsentByClientAndUser(client: Client, user: User): Promise<Consent | null>;

  /**
   * Searches the application's storage for a Grant containing the provided Consent Challenge.
   *
   * @param consentChallenge Consent Challenge of the Grant.
   * @returns Grant based on the provided Consent Challenge.
   */
  public abstract findGrantByConsentChallenge(consentChallenge: string): Promise<Grant | null>;

  /**
   * Searches the application's storage for a Grant containing the provided Login Challenge.
   *
   * @param loginChallenge Login Challenge of the Grant.
   * @returns Grant based on the provided Login Challenge.
   */
  public abstract findGrantByLoginChallenge(loginChallenge: string): Promise<Grant | null>;

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key Identifier.
   *
   * @param id JSON Web Key Identifier.
   * @returns JSON Web Key of the Identity Provider based on the provided Key Identifier.
   */
  public abstract findJsonWebKeyByKeyId?(id: string): Promise<JsonWebKey | null>;

  /**
   * Searches the application's storage for a Refresh Token containing the provided Identifier.
   *
   * @param id Refresh Token Identifier.
   * @returns Refresh Token based on the provided Identifier.
   */
  public abstract findRefreshTokenById?(id: string): Promise<RefreshToken | null>;

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
   * Searches the application's storage for a User containing the provided Username.
   *
   * *note: this method only needs to be implemented when using the Resource Owner Password Credentials Grant Type*.
   *
   * @param username Username of the User to be fetched.
   *
   * *notice: the username does not necessarily mean that a username field has to be defined at the User Entity.
   * It can mean anything from a username to an email, custom identifier, personal documentation, phone number
   * or anything that the application uses to identify a single User.*
   *
   * @param password Password of the User to be fetched.
   * @returns User based on the provided Credentials.
   */
  public abstract findUserByResourceOwnerCredentials?(username: string, password: string): Promise<User | null>;

  /**
   * Gets the active Client Assertion Sign JSON Web Key of the Identity Provider.
   *
   * @returns Active Client Assertion Sign JSON Web Key of the Identity Provider.
   */
  public abstract getClientAssertionSignJsonWebKey?(): Promise<JsonWebKey>;

  /**
   * Gets the active Client Assertion Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested Client Assertions.*
   *
   * @returns Active Client Assertion Unwrap JSON Web Key of the Identity Provider.
   */
  public abstract getClientAssertionUnwrapJsonWebKey?(): Promise<JsonWebKey>;

  /**
   * Retrieves the Wrap JSON Web Key of the Client.
   *
   * @param client Client of the Request.
   * @throws {InvalidClientError} Failed to get a Wrap JSON Web Key from the Client's JSON Web Key Set.
   * @returns Wrap JSON Web key of the Client.
   */
  public abstract getClientWrapJsonWebKey?(client: Client): Promise<JsonWebKey>;

  /**
   * Gets the active JWT Bearer Grant Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested JWT Bearer Grants.*
   *
   * @returns Active JWT Bearer Grant Unwrap JSON Web Key of the Identity Provider.
   */
  public abstract getJwtBearerGrantUnwrapJsonWebKey?(): Promise<JsonWebKey>;

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

  /**
   * Inactivates the Active Login from the User-Agent's Session.
   *
   * This does not remove the actual Login from the storage, only makes it inactive on the Session.
   *
   * @param session Session of the User-Agent.
   */
  public abstract inactivateSessionActiveLogin(session: Session): Promise<void>;

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
   * Revokes the provided Authorization Code.
   *
   * @param authorizationCode Authorization Code to be revoked.
   */
  public abstract revokeAuthorizationCode(authorizationCode: AuthorizationCode): Promise<void>;

  /**
   * Rotates the Refresh Token by creating a new Refresh Token with the same metadata and different Identifier,
   * and revoking the old Refresh Token.
   *
   * *note: this method is only required when supporting Refresh Token Rotation.*
   *
   * @param refreshToken Refresh Token provided by the Client.
   * @returns Rotated Refresh Token with the same metadata as the revoked one.
   */
  public abstract rotateRefreshToken?(refreshToken: RefreshToken): Promise<RefreshToken>;

  /**
   * Persists the provided Grant into the application's storage.
   *
   * @param grant Grant to be persisted.
   */
  public abstract saveGrant(grant: Grant): Promise<void>;

  /**
   * Persists the provided Login into the application's storage.
   *
   * @param login Login to be persisted.
   */
  public abstract saveLogin(login: Login): Promise<void>;

  /**
   * Persists the provided Session into the application's storage.
   *
   * @param session Session to be persisted.
   */
  public abstract saveSession(session: Session): Promise<void>;
}
