import { Buffer } from 'buffer';
import { randomUUIDv7 } from 'crypto';
import fs from 'fs';
import { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import path from 'path';
import { URL } from 'url';

import { Injectable } from '@guarani/di';
import {
  ContentEncryptionAlgorithm,
  DigitalSignatureAlgorithm,
  JsonWebKey,
  JsonWebKeySet,
  KeyManagementAlgorithm,
} from '@guarani/jose';
import { jsonParse, removeNullishValues } from '@guarani/primitives';

import { UserinfoClaimsParameters } from '../../claims/userinfo/userinfo.claims.parameters';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { UserAddress } from '../../entities/user-address';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { PKCE } from '../../pkces/pkce';
import { PKCEName } from '../../pkces/pkce-name.type';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { SubjectTypeName } from '../../subject-types/subject-type-name.type';
import { AccessTokenType } from '../../types/access-token-type.type';
import { ApplicationType } from '../../types/application-type.type';
import { ClientType } from '../../types/client-type.type';
import { getClientJsonWebKey } from '../../utils/get-client-jsonwebkey/get-client-jsonwebkey';
import { DataAccess } from '../data-access';

/**
 * Implementation of the SQLite Data Access.
 */
@Injectable()
export class SQLiteDataAccess extends DataAccess {
  /**
   * Instantiates a new SQLite Data Access.
   *
   * @param logger Logger of the Identity Provider.
   * @param database Instance of the SQLite Database.
   * @param jsonWebKeySet JSON Web Key Set of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly database: DatabaseSync,
    private readonly jsonWebKeySet: JsonWebKeySet,
  ) {
    super();

    this.logger.warn(
      `[${this.constructor.name}] Using the default SQLite Data Access. This is only recommended for development environments.`,
      'cb97e86b-bc91-468f-919e-611df74dcc32',
      null,
    );
  }

  /**
   * Runs the provided sequence of operations as an atomic operation.
   *
   * @param operations Contains the sequence of operations to be run as an atomic operation.
   * @returns Returns the result of the Operations function.
   */
  public async atomic<T>(operations: () => Promise<T>): Promise<T> {
    this.logger.debug(`[${this.constructor.name}] Called atomic()`, 'f9ea89a4-a2cc-43ea-b59f-0ec761091dc6', null);

    try {
      this.database.exec('PRAGMA foreign_keys = ON;');
      this.database.exec('BEGIN TRANSACTION;');

      const result = await operations();

      this.database.exec('COMMIT;');

      this.logger.debug(`[${this.constructor.name}] Completed atomic()`, 'efe875e7-aaa1-445e-bf45-b2a9864624c1', null);
      return result;
    } catch (error: unknown) {
      this.database.exec('ROLLBACK;');

      this.logger.error(
        `[${this.constructor.name}] Failed atomic()`,
        '3f97f5da-0764-48c6-89f4-21956038c5ec',
        null,
        error as Error,
      );

      throw error;
    }
  }

  /**
   * Creates an Access Token for authorized use by the Client.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Authorization.
   * @returns Created Access Token.
   */
  public async createAccessToken(scopes: Scope[], client: Client, user: User | null): Promise<AccessToken> {
    const id = randomUUIDv7();

    const accessTokenSql = this._procedure('create-access-token.sql');
    const accessTokenParameters = this.database
      .prepare(accessTokenSql)
      .get({ id: toUUIDBuffer(id), client_id: toUUIDBuffer(client.id), user_id: user ? toUUIDBuffer(user.id) : null })!;

    const scopesIds = scopes.map((scope) => scope.id);

    const accessTokenScopesSql = this._procedure('create-access-token-scopes.sql').replace(
      '$data',
      scopesIds.map(() => '(?, ?)').join(', '),
    );

    this.database
      .prepare(accessTokenScopesSql)
      .run(...scopesIds.flatMap((scopeId) => [toUUIDBuffer(id), toUUIDBuffer(scopeId)]));

    return Object.assign<AccessToken, AccessToken>(new AccessToken(), {
      id: toUUIDString(accessTokenParameters['id'] as Uint8Array),
      type: accessTokenParameters['type'] as AccessTokenType,
      scopes,
      createdAt: new Date((accessTokenParameters['created_at'] as number) * 1000),
      expiresAt: new Date((accessTokenParameters['expires_at'] as number) * 1000),
      revokedAt: accessTokenParameters['revoked_at']
        ? new Date((accessTokenParameters['revoked_at'] as number) * 1000) // TODO: Test on Revocation Endpoint
        : null,
      validAfter: new Date((accessTokenParameters['valid_after'] as number) * 1000),
      client,
      user,
    });
  }

  /**
   * Creates an Authorization Code to be exchanged by the Client at the Token Endpoint for an Access Token.
   *
   * @param codeChallenge PKCE Code Challenge.
   * @param codeChallengeMethod PKCE Code Challenge Method.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Created Authorization Code.
   */
  public async createAuthorizationCode(
    codeChallenge: string,
    codeChallengeMethod: PKCE,
    login: Login,
    consent: Consent,
  ): Promise<AuthorizationCode> {
    const id = randomUUIDv7();

    const authorizationCodeSql = this._procedure('create-authorization-code.sql');
    const authorizationCodeParameters = this.database.prepare(authorizationCodeSql).get({
      id: toUUIDBuffer(id),
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod.name,
      login_id: toUUIDBuffer(login.id),
      consent_id: toUUIDBuffer(consent.id),
    })!;

    return Object.assign<AuthorizationCode, AuthorizationCode>(new AuthorizationCode(), {
      id: toUUIDString(authorizationCodeParameters['id'] as Uint8Array),
      codeChallenge: authorizationCodeParameters['code_challenge']!.toString(),
      codeChallengeMethod: authorizationCodeParameters['code_challenge_method']!.toString() as PKCEName,
      createdAt: new Date((authorizationCodeParameters['created_at'] as number) * 1000),
      expiresAt: new Date((authorizationCodeParameters['expires_at'] as number) * 1000),
      revokedAt: authorizationCodeParameters['revoked_at']
        ? new Date((authorizationCodeParameters['revoked_at'] as number) * 1000) // TODO: Test on Token Endpoint
        : null,
      validAfter: new Date((authorizationCodeParameters['valid_after'] as number) * 1000),
      login,
      consent,
    });
  }

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Client Identifier.
   * @returns Client based on the provided Identifier.
   */
  public async findClientById(id: string): Promise<Client | null> {
    return this._findClientById(id);
  }

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key Identifier.
   *
   * @param id JSON Web Key Identifier.
   * @returns JSON Web Key of the Identity Provider based on the provided Key Identifier.
   */
  public async findJsonWebKeyByKeyId?(id: string): Promise<JsonWebKey | null> {
    return this.jsonWebKeySet.find((jsonWebKey) => jsonWebKey.kid === id);
  }

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Session Identifier.
   * @returns Session based on the provided Identifier.
   */
  public async findSessionById(id: string): Promise<Session | null> {
    return this._findSessionById(id, null, null);
  }

  /**
   * Searches the application's storage for a User containing the provided Identifier.
   *
   * @param id User Identifier.
   * @returns User based on the provided Identifier.
   */
  public async findUserById(id: string): Promise<User | null> {
    return this._findUserById(id);
  }

  /**
   * Retrieves the Wrap JSON Web Key of the Client.
   *
   * @param client Client of the Request.
   * @throws {InvalidClientError} Failed to get a Wrap JSON Web Key from the Client's JSON Web Key Set.
   * @returns Wrap JSON Web key of the Client.
   */
  public async getClientWrapJsonWebKey?(client: Client): Promise<JsonWebKey> {
    return await getClientJsonWebKey(client, (jsonWebKey) => jsonWebKey.use === 'enc');
  }

  /**
   * Returns the Scopes of the application's storage.
   *
   * @returns Scopes of the application's storage.
   */
  public async getScopes(): Promise<Scope[]> {
    return this._getScopes();
  }

  /**
   * Returns the Scopes requested from the application's storage.
   *
   * @param scopes Scopes requested by the Client.
   * @returns Scopes requested from the application's storage.
   */
  public async getScopesByName(scopes: string[]): Promise<Scope[]> {
    return this._getScopesByName(scopes);
  }

  /**
   * Gets the active Sign JSON Web Key of the Identity Provider.
   *
   * @returns Active Sign JSON Web Key of the Identity Provider.
   */
  public async getSignJsonWebKey?(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.use === 'sig');
  }

  /**
   * Gets the active Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested ID Tokens.*
   *
   * @returns Active Unwrap JSON Web Key of the Identity Provider.
   */
  public async getUnwrapJsonWebKey?(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.use === 'enc');
  }

  /**
   * Retrieves the claims of the provided User based on the provided Scopes.
   *
   * @param user User to have its information gathered.
   * @param scopes Scopes requested by the Client.
   * @returns Claims about the provided User.
   */
  public async getUserinfo?(user: User, scopes: Scope[]): Promise<UserinfoClaimsParameters> {
    const scopesNames = scopes.map((scope) => scope.name);
    const claims: UserinfoClaimsParameters = {};

    if (scopesNames.includes('profile')) {
      claims.name = user.name ?? undefined!;
      claims.given_name = user.givenName!;
      claims.middle_name = user.middleName ?? undefined!;
      claims.family_name = user.familyName!;
      claims.nickname = user.nickname ?? undefined!;
      claims.preferred_username = user.preferredUsername ?? undefined!;
      claims.profile = user.profile?.href ?? undefined!;
      claims.picture = user.picture?.href ?? undefined!;
      claims.website = user.website?.href ?? undefined!;
      claims.gender = user.gender ?? undefined!;
      claims.birthdate = user.birthdate!;
      claims.zoneinfo = user.zoneinfo ?? undefined!;
      claims.locale = user.locale ?? undefined!;
      claims.updated_at = Math.ceil(user.updatedAt.getTime() / 1000);
    }

    if (scopesNames.includes('email')) {
      claims.email = user.email!;
      claims.email_verified = user.emailVerified!;
    }

    if (scopesNames.includes('phone')) {
      claims.phone_number = user.phoneNumber!;
      claims.phone_number_verified = user.phoneNumberVerified!;
    }

    if (scopesNames.includes('address')) {
      claims.address = {
        formatted: user.address?.streetAddress ? user.address.streetAddress : undefined!,
        street_address: user.address?.streetAddress ?? undefined!,
        locality: user.address?.locality ?? undefined!,
        region: user.address?.region ?? undefined!,
        postal_code: user.address?.postalCode ?? undefined!,
        country: user.address?.country ?? undefined!,
      };
    }

    return removeNullishValues(claims);
  }

  /**
   * Runs the database migrations.
   */
  public async up(): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called up()`, 'd7b93d84-fdb6-48ca-905b-b5d4f86bb8e3', null);

    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'up', name), 'utf8');

    await this.atomic(async () => {
      this.database.exec(file('0001-create-table-users.sql'));
      this.database.exec(file('0002-create-table-user-addresses.sql'));
      this.database.exec(file('0003-create-table-scopes.sql'));
      this.database.exec(file('0004-create-table-clients.sql'));
      this.database.exec(file('0005-create-table-client-secrets.sql'));
      this.database.exec(file('0006-create-table-client-scopes.sql'));
      this.database.exec(file('0007-create-table-access-tokens.sql'));
      this.database.exec(file('0008-create-table-access-token-scopes.sql'));
      this.database.exec(file('0009-create-table-sessions.sql'));
      this.database.exec(file('0010-create-table-logins.sql'));
      this.database.exec(file('0011-create-table-logins-clients.sql'));
      this.database.exec(file('0012-create-table-consents.sql'));
      this.database.exec(file('0013-create-table-consent-scopes.sql'));
      this.database.exec(file('0014-create-table-grants.sql'));
      this.database.exec(file('0015-create-table-authorization-codes.sql'));
    });

    this.logger.debug(`[${this.constructor.name}] Completed up()`, '4eb4b9ca-13eb-4aa5-aee1-0be8338ca9ba', null);
  }

  /**
   * Reverts the database migrations.
   */
  public async down(): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called down()`, '2766fef0-d43a-4da5-8091-ca5c371f07b5', null);

    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'down', name), 'utf8');

    await this.atomic(async () => {
      this.database.exec(file('0015-drop-table-authorization-codes.sql'));
      this.database.exec(file('0014-drop-table-grants.sql'));
      this.database.exec(file('0013-drop-table-consent-scopes.sql'));
      this.database.exec(file('0012-drop-table-consents.sql'));
      this.database.exec(file('0011-drop-table-logins-clients.sql'));
      this.database.exec(file('0010-drop-table-logins.sql'));
      this.database.exec(file('0009-drop-table-sessions.sql'));
      this.database.exec(file('0008-drop-table-access-token-scopes.sql'));
      this.database.exec(file('0007-drop-table-access-tokens.sql'));
      this.database.exec(file('0006-drop-table-client-scopes.sql'));
      this.database.exec(file('0005-drop-table-client-secrets.sql'));
      this.database.exec(file('0004-drop-table-clients.sql'));
      this.database.exec(file('0003-drop-table-scopes.sql'));
      this.database.exec(file('0002-drop-table-user-addresses.sql'));
      this.database.exec(file('0001-drop-table-users.sql'));
    });

    this.logger.debug(`[${this.constructor.name}] Completed down()`, '7f789b07-43a5-4ee4-91db-05589bb53811', null);
  }

  /**
   * Seeds the database with custom data.
   */
  public async seed(): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called seed()`, '901495cc-a5d7-41fe-89d8-36fe61bfef3a', null);

    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'seeds', name), 'utf8');

    await this.atomic(async () => {
      this.database.exec(file('0001-seed-users.sql'));
      this.database.exec(file('0002-seed-scopes.sql'));
      this.database.exec(file('0003-seed-clients.sql'));
    });

    this.logger.debug(`[${this.constructor.name}] Completed seed()`, 'd2b02853-711c-427e-9e79-ef1014b18f30', null);
  }

  // #region Helper Methods
  private _findClientById(id: string): Client | null {
    const clientSql = this._procedure('find-client-by-id.sql');
    const clientParameters = this.database.prepare(clientSql).get({ id: toUUIDBuffer(id) });

    if (typeof clientParameters === 'undefined') {
      return null;
    }

    return instantiateClient(
      clientParameters,
      this._findClientSecretsByClientId(id),
      this._findClientScopesByClientId(id),
    );
  }

  private _findClientScopesByClientId(clientId: string): Scope[] {
    const scopesSql = this._procedure('find-client-scopes-by-client-id.sql');
    const scopesParameters = this.database.prepare(scopesSql).all({ client_id: toUUIDBuffer(clientId) });

    return instantiateScopes(scopesParameters);
  }

  private _findClientSecretsByClientId(clientId: string): ClientSecret[] {
    const clientSecretsSql = this._procedure('find-client-secrets-by-client-id.sql');
    const clientSecretsParameters = this.database.prepare(clientSecretsSql).all({ client_id: toUUIDBuffer(clientId) });

    return clientSecretsParameters.map((clientSecretParameters) => {
      return Object.assign<ClientSecret, ClientSecret>(new ClientSecret(), {
        id: toUUIDString(clientSecretParameters['id']! as Uint8Array),
        secret: Buffer.from(clientSecretParameters['secret']! as Uint8Array).toString('base64url'),
        createdAt: new Date((clientSecretParameters['created_at']! as number) * 1000),
        expiresAt: new Date((clientSecretParameters['expires_at']! as number) * 1000),
      });
    });
  }

  private _findConsentById(id: string): Consent | null {
    const consentSql = this._procedure('find-consent-by-id.sql');
    const consentParameters = this.database.prepare(consentSql).get({ id: toUUIDBuffer(id) });

    if (typeof consentParameters === 'undefined') {
      return null;
    }

    return Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
      id: toUUIDString(consentParameters['id'] as Uint8Array),
      scopes: this._findConsentScopesByConsentId(id),
      createdAt: new Date((consentParameters['created_at']! as number) * 1000),
      expiresAt: consentParameters['expires_at'] ? new Date((consentParameters['expires_at']! as number) * 1000) : null,
      client: this._findClientById(toUUIDString(consentParameters['client_id'] as Uint8Array))!,
      user: this._findUserById(toUUIDString(consentParameters['user_id'] as Uint8Array))!,
    });
  }

  private _findConsentScopesByConsentId(consentId: string): Scope[] {
    const scopesSql = this._procedure('find-consent-scopes-by-consent-id.sql');
    const scopesParameters = this.database.prepare(scopesSql).all({ consent_id: toUUIDBuffer(consentId) });

    return instantiateScopes(scopesParameters);
  }

  private _findGrantById(id: string, session: Session): Grant | null {
    const grantSql = this._procedure('find-grant-by-id.sql');
    const grantParameters = this.database.prepare(grantSql).get({ id: toUUIDBuffer(id) });

    if (typeof grantParameters === 'undefined') {
      return null;
    }

    const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
      id: toUUIDString(grantParameters['id'] as Uint8Array),
      loginChallenge: Buffer.from(grantParameters['login_challenge'] as Uint8Array).toString('hex'),
      consentChallenge: Buffer.from(grantParameters['consent_challenge'] as Uint8Array).toString('hex'),
      parameters: jsonParse(grantParameters['parameters']!.toString()) as AuthorizationRequest,
      interactions: jsonParse(grantParameters['interactions']!.toString()) as InteractionTypeName[],
      createdAt: new Date((grantParameters['created_at']! as number) * 1000),
      expiresAt: new Date((grantParameters['expires_at']! as number) * 1000),
      client: this._findClientById(toUUIDString(grantParameters['client_id'] as Uint8Array))!,
      session,
    });

    Reflect.set(
      grant,
      'consent',
      grantParameters['consent_id']
        ? this._findConsentById(toUUIDString(grantParameters['consent_id'] as Uint8Array))
        : null,
    );

    return grant;
  }

  private _findLoginById(id: string, session: Session): Login | null {
    const loginSql = this._procedure('find-login-by-id.sql');
    const loginParameters = this.database.prepare(loginSql).get({ id: toUUIDBuffer(id) });

    if (typeof loginParameters === 'undefined') {
      return null;
    }

    return Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
      id: toUUIDString(loginParameters['id'] as Uint8Array),
      amr: jsonParse(loginParameters['amr']!.toString()) as string[],
      acr: loginParameters['acr']?.toString() ?? null,
      createdAt: new Date((loginParameters['created_at']! as number) * 1000),
      expiresAt: loginParameters['expires_at'] ? new Date((loginParameters['expires_at']! as number) * 1000) : null,
      user: this._findUserById(toUUIDString(loginParameters['user_id'] as Uint8Array))!,
      session,
      clients: this._findLoginClientsByLoginId(id),
    });
  }

  private _findLoginClientsByLoginId(id: string): Client[] {
    const clientsSql = this._procedure('find-login-clients-by-login-id.sql');
    const clientsParameters = this.database.prepare(clientsSql).all({ login_id: toUUIDBuffer(id) });

    return clientsParameters.map((clientParameters) =>
      instantiateClient(
        clientParameters,
        this._findClientSecretsByClientId(toUUIDString(clientParameters['id'] as Uint8Array)),
        this._findClientScopesByClientId(toUUIDString(clientParameters['id'] as Uint8Array)),
      ),
    );
  }

  private _findLoginsBySessionId(id: string, session: Session): Login[] {
    const loginsSql = this._procedure('find-logins-by-session-id.sql');
    const loginsParameters = this.database.prepare(loginsSql).all({ session_id: toUUIDBuffer(id) });

    return loginsParameters.map((loginParameters) => {
      return Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: toUUIDString(loginParameters['id'] as Uint8Array),
        amr: jsonParse(loginParameters['amr']!.toString()) as string[],
        acr: loginParameters['acr']?.toString() ?? null,
        createdAt: new Date((loginParameters['created_at']! as number) * 1000),
        expiresAt: loginParameters['expires_at'] ? new Date((loginParameters['expires_at']! as number) * 1000) : null,
        user: this._findUserById(toUUIDString(loginParameters['user_id'] as Uint8Array))!,
        session,
        clients: this._findLoginClientsByLoginId(toUUIDString(loginParameters['id'] as Uint8Array)),
      });
    });
  }

  private _findSessionById(id: string, activeLogin: Login | null, grant: Grant | null): Session | null {
    const sessionSql = this._procedure('find-session-by-id.sql');
    const sessionParameters = this.database.prepare(sessionSql).get({ id: toUUIDBuffer(id) });

    if (typeof sessionParameters === 'undefined') {
      return null;
    }

    const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
      id: toUUIDString(sessionParameters['id'] as Uint8Array),
    });

    Reflect.set(
      session,
      'activeLogin',
      activeLogin ??
        (sessionParameters['active_login_id']
          ? this._findLoginById(toUUIDString(sessionParameters['active_login_id'] as Uint8Array), session)
          : null),
    );

    Reflect.set(
      session,
      'grant',
      grant ??
        (sessionParameters['grant_id']
          ? this._findGrantById(toUUIDString(sessionParameters['grant_id'] as Uint8Array), session)
          : null),
    );

    Reflect.set(session, 'logins', this._findLoginsBySessionId(id, session));

    return session;
  }

  private _findUserById(id: string): User | null {
    const userSql = this._procedure('find-user-by-id.sql');
    const userParameters = this.database.prepare(userSql).get({ id: toUUIDBuffer(id) });

    if (typeof userParameters === 'undefined') {
      return null;
    }

    const address: UserAddress = Object.assign<UserAddress, UserAddress>(new UserAddress(), {
      id: toUUIDString(userParameters['address_id'] as Uint8Array),
      formatted: null,
      streetAddress: userParameters['street_address']?.toString() ?? null,
      locality: userParameters['locality']?.toString() ?? null,
      region: userParameters['region']?.toString() ?? null,
      postalCode: userParameters['postal_code']?.toString() ?? null,
      country: userParameters['country']?.toString() ?? null,
    });

    return Object.assign<User, Partial<User>>(Reflect.construct(User, []), {
      id: toUUIDString(userParameters['id'] as Uint8Array),
      password: userParameters['password']!.toString(),
      name: userParameters['middle_name']
        ? `${userParameters['given_name']!.toString()} ${userParameters['middle_name'].toString()} ${userParameters['family_name']!.toString()}`
        : null,
      givenName: userParameters['given_name']!.toString(),
      middleName: userParameters['middle_name']?.toString() ?? null,
      familyName: userParameters['family_name']!.toString(),
      nickname: userParameters['nickname']?.toString() ?? null,
      preferredUsername: userParameters['preferred_username']?.toString() ?? null,
      profile: userParameters['profile'] ? new URL(userParameters['profile'].toString()) : null,
      picture: userParameters['picture'] ? new URL(userParameters['picture'].toString()) : null,
      website: userParameters['website'] ? new URL(userParameters['website'].toString()) : null,
      email: userParameters['email']!.toString(),
      emailVerified: userParameters['email_verified']! === 1,
      gender: userParameters['gender']?.toString() ?? null,
      birthdate: userParameters['birthdate']!.toString(),
      zoneinfo: userParameters['zoneinfo']?.toString() ?? null,
      locale: userParameters['locale']?.toString() ?? null,
      phoneNumber: userParameters['phone_number']!.toString(),
      phoneNumberVerified: userParameters['phone_number_verified']! === 1,
      address,
      createdAt: new Date((userParameters['created_at']! as number) * 1000),
      updatedAt: new Date((userParameters['updated_at']! as number) * 1000),
    });
  }

  private _getScopes(): Scope[] {
    const scopesSql = this._procedure('get-scopes.sql');
    const scopesParameters = this.database.prepare(scopesSql).all();

    return instantiateScopes(scopesParameters);
  }

  private _getScopesByName(scopes: string[]): Scope[] {
    const scopesSql = this._procedure('get-scopes-by-name.sql').replace('$scopes', scopes.map(() => '?').join(','));
    const scopesParameters = this.database.prepare(scopesSql).all(...scopes);

    return instantiateScopes(scopesParameters);
  }

  private _procedure(name: string): string {
    return fs.readFileSync(path.join(__dirname, 'procedures', name), 'utf8');
  }
  // #endregion
}

function toUUIDString(data: Uint8Array): string {
  return Buffer.from(data)
    .toString('hex')
    .replace(/^([\d\w]{8})([\d\w]{4})([\d\w]{4})([\d\w]{4})([\d\w]{12})/i, '$1-$2-$3-$4-$5');
}

function toUUIDBuffer(data: string): Buffer {
  return Buffer.from(data.replaceAll('-', ''), 'hex');
}

function instantiateClient(
  parameters: Record<string, SQLOutputValue>,
  secrets: ClientSecret[],
  scopes: Scope[],
): Client {
  return Object.assign<Client, Client>(new Client(), {
    id: toUUIDString(parameters['id']! as Uint8Array),
    secrets,
    name: parameters['name']!.toString(),
    type: parameters['type']!.toString() as ClientType,
    profile: parameters['profile']!.toString() as ApplicationType,
    redirectUris: (jsonParse(parameters['redirect_uris']!.toString()) as string[]).map((redirectUri) => {
      return new URL(redirectUri);
    }),
    scopes,
    responseTypes: jsonParse(parameters['response_types']!.toString()) as ResponseTypeName[],
    contacts: jsonParse(parameters['contacts']!.toString()) as string[],
    clientUri: parameters['client_uri'] ? new URL(parameters['client_uri'].toString()) : null,
    logoUri: parameters['logo_uri'] ? new URL(parameters['logo_uri'].toString()) : null,
    policyUri: parameters['policy_uri'] ? new URL(parameters['policy_uri'].toString()) : null,
    tosUri: parameters['tos_uri'] ? new URL(parameters['tos_uri'].toString()) : null,
    jwksUri: parameters['jwks_uri'] ? new URL(parameters['jwks_uri'].toString()) : null,
    jwks: parameters['jwks'] ? jsonParse(parameters['jwks'].toString()) : null,
    sectorIdentifierUri: parameters['sector_identifier_uri']
      ? new URL(parameters['sector_identifier_uri'].toString())
      : null,
    subjectType: parameters['subject_type']!.toString() as SubjectTypeName,
    idTokenSignedResponseAlgorithm:
      (parameters['id_token_signed_response_alg']?.toString() as Exclude<DigitalSignatureAlgorithm, 'none'>) ?? null,
    idTokenEncryptedResponseKeyWrap:
      (parameters['id_token_encrypted_response_alg']?.toString() as KeyManagementAlgorithm) ?? null,
    idTokenEncryptedResponseContentEncryption:
      (parameters['id_token_encrypted_response_enc']?.toString() as ContentEncryptionAlgorithm) ?? null,
    defaultMaxAge: (parameters['default_max_age'] as number) ?? null,
    requireAuthTime: parameters['require_auth_time'] === 1,
    defaultAcrValues: jsonParse(parameters['default_acr_values']!.toString()),
    softwareId: parameters['software_id']?.toString() ?? null,
    softwareVersion: parameters['software_version']?.toString() ?? null,
    createdAt: new Date((parameters['created_at']! as number) * 1000),
    updatedAt: new Date((parameters['updated_at']! as number) * 1000),
  });
}

function instantiateScopes(parameters: Record<string, SQLOutputValue>[]): Scope[] {
  return parameters.map((scope) => {
    return Object.assign<Scope, Scope>(new Scope(), {
      id: toUUIDString(scope['id']! as Uint8Array),
      name: scope['name']!.toString(),
      description: scope['description']?.toString() ?? null,
      createdAt: new Date((scope['created_at']! as number) * 1000),
      updatedAt: new Date((scope['updated_at']! as number) * 1000),
    });
  });
}
