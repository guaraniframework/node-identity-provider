/* istanbul ignore file */
import { Buffer } from 'buffer';
import { randomBytes, randomUUIDv7 } from 'crypto';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { URL } from 'url';
import { promisify } from 'util';

import { Injectable } from '@guarani/di';
import {
  ContentEncryptionAlgorithm,
  DigitalSignatureAlgorithm,
  JsonWebKey,
  JsonWebKeySet,
  jwks,
  KeyManagementAlgorithm,
} from '@guarani/jose';
import { jsonParse, jsonStringify, removeNullishValues } from '@guarani/primitives';

import { AddressClaimParameters } from '../../claims/userinfo/address.claim.parameters';
import { UserinfoClaimsParameters } from '../../claims/userinfo/userinfo.claims.parameters';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { CodeAuthorizationRequest } from '../../requests/authorization/code/code.authorization-request';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { SubjectTypeName } from '../../subject-types/subject-type-name.type';
import { ApplicationType } from '../../types/application-type.type';
import { ClientType } from '../../types/client-type.type';
import { DataAccess } from '../data-access';

const randomBytesAsync = promisify(randomBytes);

/**
 * Implementation of the SQLite Data Access.
 */
@Injectable()
export class SQLiteDataAccess extends DataAccess {
  /**
   * Instantiates a new SQLite Data Access.
   *
   * @param database SQLite Database instance.
   * @param jsonWebKeySet JSON Web Key Set of the Identity Provider.
   */
  public constructor(
    private readonly database: DatabaseSync,
    private readonly jsonWebKeySet: JsonWebKeySet,
  ) {
    super();

    down(this.database);
    up(this.database);
  }

  /**
   * Creates an Access Token for authorized use by the Client.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Authorization.
   * @returns Issued Access Token.
   */
  public async createAccessToken(scopes: string[], client: Client, user: User | null): Promise<AccessToken> {
    const now = Math.ceil(Date.now() / 1000);

    const accessToken: AccessToken = Object.assign<AccessToken, AccessToken>(Reflect.construct(AccessToken, []), {
      id: randomUUIDv7(),
      scopes,
      createdAt: new Date(now),
      expiresAt: new Date(now + 3600000),
      revokedAt: null,
      validAfter: new Date(now),
      client,
      user,
    });

    const sql = `
      INSERT INTO access_tokens
        (id, scopes, created_at, expires_at, revoked_at, valid_after, client_id, user_id)
      VALUES
        ($id, $scopes, $created_at, $expires_at, $revoked_at, $valid_after, $client_id, $user_id);
      `;

    this.database.prepare(sql).run({
      id: toUUIDBuffer(accessToken.id),
      scopes: jsonStringify(accessToken.scopes),
      created_at: Math.ceil(accessToken.createdAt.getTime() / 1000),
      expires_at: Math.ceil(accessToken.expiresAt.getTime() / 1000),
      revoked_at: null,
      valid_after: Math.ceil(accessToken.validAfter.getTime() / 1000),
      client_id: toUUIDBuffer(accessToken.client.id),
      user_id: accessToken.user ? toUUIDBuffer(accessToken.user.id) : null,
    })!;

    return accessToken;
  }

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
  public async createAccessTokenAndAuthorizationCode(
    parameters: CodeAuthorizationRequest,
    scopes: string[],
    client: Client,
    login: Login,
    consent: Consent,
  ): Promise<[AccessToken, AuthorizationCode]> {
    const now = Math.ceil(Date.now() / 1000);

    const accessToken: AccessToken = Object.assign<AccessToken, AccessToken>(Reflect.construct(AccessToken, []), {
      id: randomUUIDv7(),
      scopes,
      createdAt: new Date(now),
      expiresAt: new Date(now + 3600000),
      revokedAt: null,
      validAfter: new Date(now),
      client,
      user: consent.user,
    });

    const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, AuthorizationCode>(
      Reflect.construct(AuthorizationCode, []),
      {
        id: randomUUIDv7(),
        parameters,
        createdAt: new Date(now),
        expiresAt: new Date(now + 300000),
        revokedAt: null,
        validAfter: new Date(now),
        login,
        consent,
      },
    );

    const sql = `
      BEGIN TRANSACTION;
      INSERT INTO access_tokens
        (id, scopes, created_at, expires_at, valid_after, client_id, user_id)
      VALUES
        ($access_token_id, $access_token_scopes, $access_token_created_at, $access_token_expires_at,
         $access_token_valid_after, $access_token_client_id, $access_token_user_id);
      INSERT INTO authorization_codes
        (id, parameters, created_at, expires_at, valid_after, login_id, consent_id)
      VALUES
        ($authorization_code_id, $authorization_code_parameters, $authorization_code_created_at, $authorization_code_expires_at,
         $authorization_code_valid_after, $authorization_code_login_id, $authorization_code_consent_id);
      COMMIT;
      `;

    this.database.prepare(sql).run({
      access_token_id: toUUIDBuffer(accessToken.id),
      access_token_scopes: jsonStringify(accessToken.scopes),
      access_token_created_at: Math.ceil(accessToken.createdAt.getTime() / 1000),
      access_token_expires_at: Math.ceil(accessToken.expiresAt.getTime() / 1000),
      access_token_valid_after: Math.ceil(accessToken.validAfter.getTime() / 1000),
      access_token_client_id: toUUIDBuffer(accessToken.client.id),
      access_token_user_id: toUUIDBuffer(accessToken.user!.id),
      authorization_code_id: toUUIDBuffer(authorizationCode.id),
      authorization_code_parameters: jsonStringify(authorizationCode.parameters),
      authorization_code_created_at: Math.ceil(authorizationCode.createdAt.getTime() / 1000),
      authorization_code_expires_at: Math.ceil(authorizationCode.expiresAt.getTime() / 1000),
      authorization_code_valid_after: Math.ceil(authorizationCode.validAfter.getTime() / 1000),
      authorization_code_login_id: toUUIDBuffer(authorizationCode.login.id),
      authorization_code_consent_id: toUUIDBuffer(authorizationCode.consent.id),
    })!;

    return [accessToken, authorizationCode];
  }

  /**
   * Creates an Authorization Code to be exchanged by the Client at the Token Endpoint for an Access Token.
   *
   * @param parameters Parameters of the Code Authorization Request.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Issued Authorization Code.
   */
  public async createAuthorizationCode(
    parameters: CodeAuthorizationRequest,
    login: Login,
    consent: Consent,
  ): Promise<AuthorizationCode> {
    const now = Math.ceil(Date.now() / 1000);

    const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, AuthorizationCode>(
      Reflect.construct(AuthorizationCode, []),
      {
        id: randomUUIDv7(),
        parameters,
        createdAt: new Date(now),
        expiresAt: new Date(now + 300000),
        revokedAt: null,
        validAfter: new Date(now),
        login,
        consent,
      },
    );

    const sql = `
      INSERT INTO authorization_codes
        (id, parameters, created_at, expires_at, valid_after, login_id, consent_id)
      VALUES
        ($id, $parameters, $created_at, $expires_at, $valid_after, $login_id, $consent_id);
      `;

    this.database.prepare(sql).run({
      id: toUUIDBuffer(authorizationCode.id),
      parameters: jsonStringify(authorizationCode.parameters),
      created_at: Math.ceil(authorizationCode.createdAt.getTime() / 1000),
      expires_at: Math.ceil(authorizationCode.expiresAt.getTime() / 1000),
      valid_after: Math.ceil(authorizationCode.validAfter.getTime() / 1000),
      login_id: toUUIDBuffer(authorizationCode.login.id),
      consent_id: toUUIDBuffer(authorizationCode.consent.id),
    })!;

    return authorizationCode;
  }

  /**
   * Creates a Grant used to authenticate an User at the Identity Provider.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @param session Session containing the Logins for the User-Agent.
   * @returns Generated Grant.
   */
  public async createGrant(parameters: AuthorizationRequest, client: Client, session: Session): Promise<Grant> {
    const [loginChallengeBuffer, consentChallengeBuffer] = await Promise.all([
      randomBytesAsync(16),
      randomBytesAsync(16),
    ]);

    const now = Math.ceil(Date.now() / 1000);

    const grant: Grant = Object.assign<Grant, Grant>(Reflect.construct(Grant, []), {
      id: randomUUIDv7(),
      loginChallenge: loginChallengeBuffer.toString('hex'),
      consentChallenge: consentChallengeBuffer.toString('hex'),
      parameters,
      interactions: [],
      createdAt: new Date(now),
      expiresAt: new Date(now + 300000),
      client,
      session,
      consent: null,
    });

    const sql = `
      INSERT INTO grants
        (id, login_challenge, consent_challenge, parameters, interactions, created_at, expires_at, client_id, session_id)
      VALUES
        ($id, $login_challenge, $consent_challenge, $parameters, $interactions, $created_at, $expires_at, $client_id, $session_id);
      `;

    this.database.prepare(sql).run({
      id: toUUIDBuffer(grant.id),
      login_challenge: Buffer.from(grant.loginChallenge, 'hex'),
      consent_challenge: Buffer.from(grant.consentChallenge, 'hex'),
      parameters: jsonStringify(grant.parameters),
      interactions: jsonStringify(grant.interactions),
      created_at: Math.ceil(grant.createdAt.getTime() / 1000),
      expires_at: Math.ceil(grant.expiresAt.getTime() / 1000),
      client_id: toUUIDBuffer(grant.client.id),
      session_id: toUUIDBuffer(grant.session.id),
    })!;

    return grant;
  }

  /**
   * Creates a Session Entity to store the Sessions created at the Device for multi-account.
   *
   * @returns Newly created Session Entity.
   */
  public async createSession(): Promise<Session> {
    const session: Session = Object.assign<Session, Session>(Reflect.construct(Session, []), {
      id: randomUUIDv7(),
      activeLogin: null,
      logins: [],
      grant: null,
    });

    const sql = 'INSERT INTO sessions (id) VALUES ($id);';
    this.database.prepare(sql).run({ id: toUUIDBuffer(session.id) })!;

    return session;
  }

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Identifier of the Client.
   * @returns Client based on the provided Identifier.
   */
  public async findClient(id: string): Promise<Client | null> {
    return this._findClientById(id);
  }

  /**
   * Searches the application's storage for a Consent based on the provided Client and User.
   *
   * @param client Client requesting Consent.
   * @param user User granting Consent.
   * @returns Consent based on the provided Client and User.
   */
  public async findConsent(client: Client, user: User): Promise<Consent | null> {
    return this._findConsentByClientAndUser(client, user);
  }

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key ID.
   *
   * @param id JSON Web Key ID.
   * @returns JSON Web Key of the Identity Provider based on the provided Key ID.
   */
  public async findJsonWebKey(id: string): Promise<JsonWebKey | null> {
    return this.jsonWebKeySet.find((jsonWebKey) => jsonWebKey.kid === id);
  }

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Identifier of the Session.
   * @returns Session based on the provided Identifier.
   */
  public async findSession(id: string): Promise<Session | null> {
    return this._findSessionById(id, null, null);
  }

  /**
   * Searches the application's storage for a User containing the provided Identifier.
   *
   * @param id Identifier of the User.
   * @returns User based on the provided Identifier.
   */
  public async findUser(id: string): Promise<User | null> {
    return this._findUserById(id);
  }

  /**
   * Retrieves the Wrap JSON Web Key of the Client.
   *
   * @param client Client of the Request.
   * @returns Wrap JSON Web key of the Client.
   */
  public async getClientWrapJsonWebKey(client: Client): Promise<JsonWebKey> {
    return (await jwks.create(client.jwks!)).get((jsonWebKey) => jsonWebKey.use === 'enc');
  }

  /**
   * Gets the active Sign JSON Web Key of the Identity Provider.
   *
   * @returns Active Sign JSON Web Key of the Identity Provider.
   */
  public async getSignJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.use === 'sig');
  }

  /**
   * Gets the active Unwrap JSON Web Key of the Identity Provider.
   *
   * *Note: This method only needs to be implemented if the Identity Provider supports nested ID Tokens.*
   *
   * @returns Active Unwrap JSON Web Key of the Identity Provider.
   */
  public async getUnwrapJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.use === 'enc');
  }

  /**
   * Retrieves claims about the provided User based on the provided scopes.
   *
   * @param user User to have its information gathered.
   * @param scopes Scopes requested by the Client.
   * @returns Claims about the provided User.
   */
  public async getUserinfo(user: User, scopes: string[]): Promise<UserinfoClaimsParameters> {
    const claims: UserinfoClaimsParameters = {};

    if (scopes.includes('profile')) {
      claims.name = user['name'] as string;
      claims.given_name = user['given_name'] as string;
      claims.middle_name = user['middle_name'] as string;
      claims.family_name = user['family_name'] as string;
      claims.picture = user['picture'] as string;
      claims.gender = user['gender'] as string;
      claims.birthdate = new Date(user['birthdate'] as string).toISOString().substring(0, 10);
      claims.updated_at = Math.ceil(new Date(user['updated_at'] as number).getTime() / 1000);
    }

    if (scopes.includes('email')) {
      claims.email = user['email'] as string;
      claims.email_verified = user['email_verified'] === 1;
    }

    if (scopes.includes('phone')) {
      claims.phone_number = user['phone_number'] as string;
      claims.phone_number_verified = user['phone_number_verified'] === 1;
    }

    if (scopes.includes('address')) {
      Object.assign<AddressClaimParameters, AddressClaimParameters>(
        claims.address!,
        user['address'] as AddressClaimParameters,
      );
    }

    return removeNullishValues(claims);
  }

  /**
   * Logs out the Authenticated User represented by the provided Login.
   *
   * @param login Login to be removed.
   * @param session Session of the User-Agent.
   */
  public async logout(login: Login, session: Session): Promise<void> {
    if (session.activeLogin instanceof Login && session.activeLogin.id === login.id) {
      const sql = `
        BEGIN TRANSACTION;
        DELETE FROM logins WHERE id = $id;
        UPDATE sessions SET active_login_id = NULL WHERE active_login_id = $id;
        COMMIT;
        `;

      this.database.prepare(sql).run({ id: toUUIDBuffer(login.id) });
      session.activeLogin = null;
    }
  }

  /**
   * Removes the provided Consent.
   *
   * @param consent Consent to be removed.
   */
  public async removeConsent(consent: Consent): Promise<void> {
    const sql = 'DELETE FROM consents WHERE id = $id;';
    this.database.prepare(sql).run({ id: toUUIDBuffer(consent.id) });
  }

  /**
   * Removes the provided Grant.
   *
   * @param grant Grant to be removed.
   */
  public async removeGrant(grant: Grant): Promise<void> {
    const sql = 'DELETE FROM grants WHERE id = $id;';
    this.database.prepare(sql).run({ id: toUUIDBuffer(grant.id) });
  }

  /**
   * Inactivates the Active Login from the User-Agent's Session.
   *
   * This does not remove the actual Login from the storage,
   * only makes it inactive on the Session.
   *
   * @param session Session of the User-Agent.
   */
  public async inactivateSessionActiveLogin(session: Session): Promise<void> {
    const sql = 'UPDATE sessions SET active_login_id = NULL WHERE id = $id';
    this.database.prepare(sql).run({ id: toUUIDBuffer(session.id) });
  }

  // #region Helper Methods.
  private _findClientById(id: string): Client | null {
    const clientSql = `
      SELECT id, name, type, profile, redirect_uris, response_types, scopes, home_uri, logo_uri,
            contacts, policy_uri, tos_uri, jwks_uri, jwks, subject_type, sector_identifier_uri,
            id_token_signed_response_algorithm, id_token_encrypted_response_key_wrap,
            id_token_encrypted_response_content_encryption, software_id, software_version, created_at
      FROM clients WHERE id = $id;
      `;

    const clientParameters = this.database.prepare(clientSql).get({ id: toUUIDBuffer(id) });

    if (typeof clientParameters === 'undefined') {
      return null;
    }

    const clientSecretsSql = 'SELECT secret, created_at, expires_at FROM client_secrets WHERE client_id = $client_id;';
    const clientSecretsParameters = this.database.prepare(clientSecretsSql).all({ client_id: toUUIDBuffer(id) });

    const secrets = clientSecretsParameters.map((clientSecretParameters) =>
      Object.assign<ClientSecret, ClientSecret>(Reflect.construct(ClientSecret, []), {
        secret: clientSecretParameters['secret']!.toString(),
        createdAt: new Date((clientSecretParameters['created_at']! as number) * 1000),
        expiresAt: new Date((clientSecretParameters['secret']! as number) * 1000),
      }),
    );

    return Object.assign<Client, Client>(Reflect.construct(Client, []), {
      id: toUUIDString(clientParameters['id']! as Uint8Array),
      secrets,
      name: clientParameters['name']!.toString(),
      type: clientParameters['type']!.toString() as ClientType,
      profile: clientParameters['profile']!.toString() as ApplicationType,
      redirectUris: (jsonParse(clientParameters['redirect_uris']!.toString()) as string[]).map((redirectUri) => {
        return new URL(redirectUri);
      }),
      responseTypes: jsonParse(clientParameters['response_types']!.toString()) as ResponseTypeName[],
      scopes: jsonParse(clientParameters['scopes']!.toString()) as string[],
      homeUri: clientParameters['home_uri'] ? new URL(clientParameters['home_uri'].toString()) : null,
      logoUri: clientParameters['logo_uri'] ? new URL(clientParameters['logo_uri'].toString()) : null,
      contacts: jsonParse(clientParameters['contacts']!.toString()) as string[],
      policyUri: clientParameters['policy_uri'] ? new URL(clientParameters['policy_uri'].toString()) : null,
      tosUri: clientParameters['tos_uri'] ? new URL(clientParameters['tos_uri'].toString()) : null,
      jwksUri: clientParameters['jwks_uri'] ? new URL(clientParameters['jwks_uri'].toString()) : null,
      jwks: clientParameters['jwks'] ? jsonParse(clientParameters['jwks']!.toString()) : null,
      subjectType: clientParameters['subject_type']!.toString() as SubjectTypeName,
      sectorIdentifierUri: clientParameters['sector_identifier_uri']
        ? new URL(clientParameters['sector_identifier_uri'].toString())
        : null,
      idTokenSignedResponseAlgorithm: clientParameters['id_token_signed_response_algorithm']!.toString() as Exclude<
        DigitalSignatureAlgorithm,
        'none'
      >,
      idTokenEncryptedResponseKeyWrap:
        (clientParameters['id_token_encrypted_response_key_wrap']?.toString() as KeyManagementAlgorithm) ?? null,
      idTokenEncryptedResponseContentEncryption:
        (clientParameters[
          'id_token_encrypted_response_content_encryption'
        ]?.toString() as ContentEncryptionAlgorithm) ?? null,
      softwareId: clientParameters['software_id']?.toString() ?? null,
      softwareVersion: clientParameters['software_version']?.toString() ?? null,
      createdAt: new Date((clientParameters['created_at']! as number) * 1000),
      findClientSecret: Client.prototype.findClientSecret,
    });
  }

  private _findConsentById(id: string): Consent | null {
    const sql = 'SELECT id, scopes, created_at, expires_at, client_id, user_id FROM consents WHERE id = $id;';
    const parameters = this.database.prepare(sql).get({ id: toUUIDBuffer(id) });

    if (typeof parameters === 'undefined') {
      return null;
    }

    return Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
      scopes: parameters['scopes']!.toString().split(' '),
      createdAt: new Date((parameters['created_at']! as number) * 1000),
      expiresAt: parameters['expires_at'] ? new Date((parameters['expires_at']! as number) * 1000) : null,
      client: this._findClientById(toUUIDString(parameters['client_id'] as Uint8Array))!,
      user: this._findUserById(toUUIDString(parameters['user_id'] as Uint8Array))!,
    });
  }

  private _findConsentByClientAndUser(client: Client, user: User): Consent | null {
    const sql = `
      SELECT id, scopes, created_at, expires_at, client_id, user_id FROM consents
      WHERE client_id = $client_id AND user_id = $user_id;
      `;

    const parameters = this.database.prepare(sql).get({
      client_id: toUUIDBuffer(client.id),
      user_id: toUUIDBuffer(user.id),
    });

    if (typeof parameters === 'undefined') {
      return null;
    }

    return Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
      scopes: parameters['scopes']!.toString().split(' '),
      createdAt: new Date((parameters['created_at']! as number) * 1000),
      expiresAt: parameters['expires_at'] ? new Date((parameters['expires_at']! as number) * 1000) : null,
      client: this._findClientById(toUUIDString(parameters['client_id'] as Uint8Array))!,
      user: this._findUserById(toUUIDString(parameters['user_id'] as Uint8Array))!,
    });
  }

  private _findGrantById(id: string, session: Session | null): Grant | null {
    const sql = `
      SELECT id, login_challenge, consent_challenge, parameters, interactions,
            created_at, expires_at, client_id, session_id, consent_id
      FROM consents WHERE id = $id;
      `;

    const parameters = this.database.prepare(sql).get({ id: toUUIDBuffer(id) });

    if (typeof parameters === 'undefined') {
      return null;
    }

    const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
      loginChallenge: Buffer.from(parameters['login_challenge'] as Uint8Array).toString('hex'),
      consentChallenge: Buffer.from(parameters['consent_challenge'] as Uint8Array).toString('hex'),
      parameters: jsonParse(parameters['parameters']!.toString()) as AuthorizationRequest,
      interactions: jsonParse(parameters['interactions']!.toString()) as InteractionTypeName[],
      createdAt: new Date((parameters['created_at']! as number) * 1000),
      expiresAt: new Date((parameters['expires_at']! as number) * 1000),
      client: this._findClientById(toUUIDString(parameters['client_id'] as Uint8Array))!,
      consent: this._findConsentById(toUUIDString(parameters['consent_id'] as Uint8Array)),
    });

    Reflect.set(
      grant,
      'session',
      session ?? this._findSessionById(toUUIDString(parameters['session_id'] as Uint8Array), null, grant)!,
    );

    return grant;
  }

  private _findLoginById(id: string, session: Session | null): Login | null {
    const sql = 'SELECT id, amr, acr, created_at, expires_at, user_id, session_id FROM logins WHERE id = $id;';
    const parameters = this.database.prepare(sql).get({ id: toUUIDBuffer(id) });

    if (typeof parameters === 'undefined') {
      return null;
    }

    const clientsIdsSql = 'SELECT id FROM clients INNER JOIN logins_clients ON logins_clients.login_id = $id;';
    const clientsIdsParameters = this.database.prepare(clientsIdsSql).all({ id: toUUIDBuffer(id) });
    const clients = clientsIdsParameters.map((p) => this._findClientById(toUUIDString(p['id'] as Uint8Array))!);

    const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
      amr: parameters['amr'] ? (jsonParse(parameters['amr'].toString()) as string[]) : null,
      acr: parameters['acr']?.toString() ?? null,
      createdAt: new Date((parameters['created_at']! as number) * 1000),
      expiresAt: parameters['expires_at'] ? new Date((parameters['expires_at']! as number) * 1000) : null,
      user: this._findUserById(toUUIDString(parameters['user_id'] as Uint8Array))!,
      clients,
    });

    Reflect.set(
      login,
      'session',
      session ?? this._findSessionById(toUUIDString(parameters['session_id'] as Uint8Array), login, null)!,
    );

    return login;
  }

  private _findLoginsBySessionId(id: string, session: Session | null): Login[] {
    const sql =
      'SELECT id, amr, acr, created_at, expires_at, user_id, session_id FROM logins WHERE session_id = $session_id;';
    const parameters = this.database.prepare(sql).all({ id: toUUIDBuffer(id) });

    return parameters.map((loginParameters) => {
      const clientsIdsSql = 'SELECT id FROM clients INNER JOIN logins_clients ON logins_clients.login_id = $id;';
      const clientsIdsParameters = this.database.prepare(clientsIdsSql).all({ id: toUUIDBuffer(id) });
      const clients = clientsIdsParameters.map((p) => this._findClientById(toUUIDString(p['id'] as Uint8Array))!);

      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: toUUIDString(loginParameters['id'] as Uint8Array),
        amr: loginParameters['amr'] ? (jsonParse(loginParameters['amr'].toString()) as string[]) : null,
        acr: loginParameters['acr']?.toString() ?? null,
        createdAt: new Date((loginParameters['created_at']! as number) * 1000),
        expiresAt: loginParameters['expires_at'] ? new Date((loginParameters['expires_at']! as number) * 1000) : null,
        user: this._findUserById(toUUIDString(loginParameters['user_id'] as Uint8Array))!,
        clients,
      });

      Reflect.set(
        login,
        'session',
        session ?? this._findSessionById(toUUIDString(loginParameters['session_id'] as Uint8Array), login, null)!,
      );

      return login;
    });
  }

  private _findSessionById(id: string, activeLogin: Login | null, grant: Grant | null): Session | null {
    const sql = 'SELECT id, active_login_id, grant_id FROM sessions WHERE id = $id;';
    const parameters = this.database.prepare(sql).get({ id: toUUIDBuffer(id) });

    if (typeof parameters === 'undefined') {
      return null;
    }

    const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
    });

    Reflect.set(
      session,
      'activeLogin',
      activeLogin ??
        (parameters['active_login_id']
          ? this._findLoginById(toUUIDString(parameters['active_login_id'] as Uint8Array), session)
          : null),
    );

    Reflect.set(
      session,
      'grant',
      grant ??
        (parameters['grant_id']
          ? this._findGrantById(toUUIDString(parameters['grant_id'] as Uint8Array), session)
          : null),
    );

    Reflect.set(session, 'logins', this._findLoginsBySessionId(id, session));

    return session;
  }

  private _findUserById(id: string): User | null {
    const sql = `
      SELECT id, password, given_name, middle_name, family_name, picture, email, email_verified, gender,
            birthdate, phone_number, phone_number_verified, address, created_at, updated_at, deleted_at
      FROM users WHERE id = $id;
      `;

    const parameters = this.database.prepare(sql).get({ id: toUUIDBuffer(id) });

    if (typeof parameters === 'undefined') {
      return null;
    }

    return Object.assign<User, Partial<User>>(Reflect.construct(User, []), {
      id: toUUIDString(parameters['id'] as Uint8Array),
      password: parameters['password']!.toString(),
      givenName: parameters['given_name']!.toString(),
      middleName: parameters['middle_name']?.toString() ?? null,
      familyName: parameters['family_name']!.toString(),
      picture: parameters['picture']?.toString() ?? null,
      email: parameters['email']!.toString(),
      emailVerified: parameters['email_verified']! === 1,
      gender: parameters['gender']?.toString() ?? null,
      birthdate: parameters['birthdate']!.toString(),
      phoneNumber: parameters['phone_number']!.toString(),
      phoneNumberVerified: parameters['phone_number_verified']! === 1,
      address: jsonParse(parameters['address']!.toString()) as AddressClaimParameters,
      createdAt: new Date((parameters['created_at']! as number) * 1000),
      updatedAt: new Date((parameters['updated_at']! as number) * 1000),
      deletedAt: parameters['deleted_at'] ? new Date((parameters['deleted_at'] as number) * 1000) : null,
    });
  }
  // #endregion
}

function up(database: DatabaseSync): void {
  const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'up', `${name}.sql`), 'utf8');

  try {
    database.exec('BEGIN TRANSACTION');
    database.exec(file('0001-create-users-table.sql'));
    database.exec(file('0002-create-client-secrets-table.sql'));
    database.exec(file('0003-create-clients-table.sql'));
    database.exec(file('0004-create-sessions-table.sql'));
    database.exec(file('0005-create-logins-table.sql'));
    database.exec(file('0006-create-logins-clients-pivot-table.sql'));
    database.exec(file('0007-create-consents-table.sql'));
    database.exec(file('0008-create-grants-table.sql'));
    database.exec(file('0009-create-authorization-codes-table.sql'));
    database.exec(file('0010-create-access-tokens-table.sql'));
    database.exec('COMMIT');
  } catch {
    database.exec('ROLLBACK');
  }
}

function down(database: DatabaseSync): void {
  const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'down', `${name}.sql`), 'utf8');

  try {
    database.exec('BEGIN TRANSACTION');
    database.exec(file('0010-drop-access-tokens-table.sql'));
    database.exec(file('0009-drop-authorization-codes-table.sql'));
    database.exec(file('0008-drop-grants-table.sql'));
    database.exec(file('0007-drop-consents-table.sql'));
    database.exec(file('0006-drop-logins-clients-pivot-table.sql'));
    database.exec(file('0005-drop-logins-table.sql'));
    database.exec(file('0004-drop-sessions-table.sql'));
    database.exec(file('0003-drop-clients-table.sql'));
    database.exec(file('0002-drop-client-secrets-table.sql'));
    database.exec(file('0001-drop-users-table.sql'));
    database.exec('COMMIT');
  } catch {
    database.exec('ROLLBACK');
  }
}

function toUUIDString(data: Uint8Array): string {
  return Buffer.from(data)
    .toString('hex')
    .replace(/^([\d\w]{8})([\d\w]{4})([\d\w]{4})([\d\w]{4})([\d\w]{12})/i, '$1-$2-$3-$4-$5');
}

function toUUIDBuffer(data: string): Buffer {
  return Buffer.from(data.replaceAll('-', ''), 'hex');
}
