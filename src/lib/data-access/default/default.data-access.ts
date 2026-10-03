/* istanbul ignore file */
import { Buffer } from 'buffer';
import { createHash, randomBytes, randomUUIDv7 } from 'crypto';
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
import { ClientAuthenticationName } from '../../client-authentication/client-authentication-name.type';
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
 * Implementation of the Default Data Access.
 */
@Injectable()
export class DefaultDataAccess extends DataAccess {
  /**
   * Instantiates a new Default Data Access.
   *
   * @param database Default Database instance.
   * @param jsonWebKeySet JSON Web Key Set of the Identity Provider.
   */
  public constructor(
    private readonly database: DatabaseSync,
    private readonly jsonWebKeySet: JsonWebKeySet,
  ) {
    super();
  }

  /**
   * Setups the Database.
   */
  public setup(): void {
    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'up', name), 'utf8');

    try {
      this.database.exec('PRAGMA foreign_keys = OFF;');
      this.database.exec('BEGIN TRANSACTION;');
      this.database.exec(file('0001-create-users-table.sql'));
      this.database.exec(file('0002-create-client-secrets-table.sql'));
      this.database.exec(file('0003-create-clients-table.sql'));
      this.database.exec(file('0004-create-sessions-table.sql'));
      this.database.exec(file('0005-create-logins-table.sql'));
      this.database.exec(file('0006-create-logins-clients-pivot-table.sql'));
      this.database.exec(file('0007-create-consents-table.sql'));
      this.database.exec(file('0008-create-grants-table.sql'));
      this.database.exec(file('0009-create-authorization-codes-table.sql'));
      this.database.exec(file('0010-create-access-tokens-table.sql'));
      this.database.exec('COMMIT;');
    } catch {
      this.database.exec('ROLLBACK;');
    }
  }

  /**
   * Tears down the Database.
   */
  public teardown(): void {
    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'down', name), 'utf8');

    try {
      this.database.exec('PRAGMA foreign_keys = OFF;');
      this.database.exec('BEGIN TRANSACTION;');
      this.database.exec(file('0010-drop-access-tokens-table.sql'));
      this.database.exec(file('0009-drop-authorization-codes-table.sql'));
      this.database.exec(file('0008-drop-grants-table.sql'));
      this.database.exec(file('0007-drop-consents-table.sql'));
      this.database.exec(file('0006-drop-logins-clients-pivot-table.sql'));
      this.database.exec(file('0005-drop-logins-table.sql'));
      this.database.exec(file('0004-drop-sessions-table.sql'));
      this.database.exec(file('0003-drop-clients-table.sql'));
      this.database.exec(file('0002-drop-client-secrets-table.sql'));
      this.database.exec(file('0001-drop-users-table.sql'));
      this.database.exec('COMMIT;');
    } catch {
      this.database.exec('ROLLBACK;');
    }
  }

  /**
   * Runs the provided sequence of operations as an atomic operation.
   *
   * @param operations Contains the sequence of operations to be run as an atomic operation.
   * @returns Returns the result of the Operations function.
   */
  public async atomic<T>(operations: () => Promise<T>): Promise<T> {
    try {
      this.database.exec('PRAGMA foreign_keys = ON;');
      this.database.exec('BEGIN TRANSACTION;');
      const result = await operations();

      this.database.exec('COMMIT;');
      return result;
    } catch (error: unknown) {
      this.database.exec('ROLLBACK;');
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
    });

    return accessToken;
  }

  /**
   * Creates an Authorization Code to be exchanged by the Client at the Token Endpoint for an Access Token.
   *
   * @param parameters Parameters of the Code Authorization Request.
   * @param login Login with the Authentication information of the User.
   * @param consent Consent with the Scopes granted by the User.
   * @returns Created Authorization Code.
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
    });

    return authorizationCode;
  }

  /**
   * Creates a Consent for the Client and the User of the Active Login.
   *
   * @param scopes Scopes granted to the Client.
   * @param client Client requesting Authorization.
   * @param user User that granted Consent.
   * @returns Created Consent.
   */
  public async createConsent(scopes: string[], client: Client, user: User): Promise<Consent> {
    const now = Math.ceil(Date.now() / 1000);

    const consent: Consent = Object.assign<Consent, Consent>(Reflect.construct(Consent, []), {
      id: randomUUIDv7(),
      scopes,
      createdAt: new Date(now),
      expiresAt: new Date(now + 300000),
      client,
      user,
    });

    const sql = `
      INSERT INTO consents
        (id, scopes, created_at, expires_at, client_id, user_id)
      VALUES
        ($id, $scopes, $created_at, $expires_at, $client_id, $user_id);
      `;

    this.database.prepare(sql).run({
      id: toUUIDBuffer(consent.id),
      scopes: jsonStringify(scopes),
      created_at: Math.ceil(consent.createdAt.getTime() / 1000),
      expires_at: consent.expiresAt ? Math.ceil(consent.expiresAt.getTime() / 1000) : null,
      client_id: toUUIDBuffer(client.id),
      user_id: toUUIDBuffer(user.id),
    });

    return consent;
  }

  /**
   * Creates a Grant used to authenticate an User at the Identity Provider.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @param session Session containing the Logins for the User-Agent.
   * @returns Created Grant.
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
      login_challenge: loginChallengeBuffer,
      consent_challenge: consentChallengeBuffer,
      parameters: jsonStringify(grant.parameters),
      interactions: jsonStringify(grant.interactions),
      created_at: Math.ceil(grant.createdAt.getTime() / 1000),
      expires_at: Math.ceil(grant.expiresAt.getTime() / 1000),
      client_id: toUUIDBuffer(grant.client.id),
      session_id: toUUIDBuffer(grant.session.id),
    });

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
    this.database.prepare(sql).run({ id: toUUIDBuffer(session.id) });

    return session;
  }

  /**
   * Creates a new User based on the provided data.
   *
   * @param data Data of the User to be registered.
   * @returns Created User.
   */
  public async createUser(data: NodeJS.Dict<unknown>): Promise<User> {
    const now = Math.ceil(Date.now() / 1000);

    const user: User = Object.assign<User, User>(Reflect.construct(User, []), {
      id: randomUUIDv7(),
      password: createHash('sha256')
        .update(data['password'] as string, 'utf8')
        .digest('base64url'),
      givenName: data['given_name'],
      middleName: data['middle_name'] ?? null,
      familyName: data['family_name'],
      picture: data['picture'] ?? null,
      email: data['email'],
      emailVerified: data['email_verified'] ? Boolean(data['email_verified']) : false,
      gender: data['gender'] ?? null,
      birthdate: data['birthdate'] ?? null,
      phoneNumber: data['phone_number'],
      phoneNumberVerified: data['phone_number_verified'] ? Boolean(data['phone_number_verified']) : false,
      address: { formatted: data['address'] },
      createdAt: new Date(now),
      updatedAt: new Date(now),
      deletedAt: null,
    });

    const sql = `
    INSERT INTO users
      (id, password, given_name, middle_name, family_name,
       picture, email, email_verified, gender, birthdate,
       phone_number, phone_number_verified, address,
       created_at, updated_at, deleted_at)
    VALUES
      ($id, $password, $given_name, $middle_name, $family_name,
       $picture, $email, $email_verified, $gender, $birthdate,
       $phone_number, $phone_number_verified, $address,
       $created_at, $updated_at, $deleted_at);
    `;

    this.database.prepare(sql).run({
      // @ts-ignore for some reason the compiler complais
      id: toUUIDBuffer(user.id),
      password: Buffer.from(user['password'] as string, 'base64url'),
      given_name: user['givenName'] as string,
      middle_name: user['middleName'] as string,
      family_name: user['familyName'] as string,
      picture: user['picture'] as string,
      email: user['email'] as string,
      email_verified: user['emailVerified'] as boolean,
      gender: user['gender'] as string,
      birthdate: user['birthdate'] as string,
      phone_number: user['phoneNumber'] as string,
      phone_number_verified: user['phoneNumberVerified'] as boolean,
      address: jsonStringify(user['address']) as string,
      created_at: Math.ceil((user['createdAt'] as Date).getTime() / 1000),
      updated_at: Math.ceil((user['updatedAt'] as Date).getTime() / 1000),
      deleted_at: null,
    });

    return user;
  }

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Identifier of the Client.
   * @returns Client based on the provided Identifier.
   */
  public async findClientById(id: string): Promise<Client | null> {
    return this._findClientById(id);
  }

  /**
   * Searches the application's storage for a Consent based on the provided Client and User.
   *
   * @param client Client requesting Consent.
   * @param user User granting Consent.
   * @returns Consent based on the provided Client and User.
   */
  public async findConsentByClientAndUser(client: Client, user: User): Promise<Consent | null> {
    return this._findConsentByClientAndUser(client, user);
  }

  /**
   * Searches the application's storage for a Grant containing the provided Consent Challenge.
   *
   * @param consentChallenge Consent Challenge of the Grant.
   * @returns Grant based on the provided Consent Challenge.
   */
  public async findGrantByConsentChallenge(consentChallenge: string): Promise<Grant | null> {
    return this._findGrantByConsentChallenge(consentChallenge, null);
  }

  /**
   * Searches the application's storage for a Grant containing the provided Login Challenge.
   *
   * @param loginChallenge Login Challenge of the Grant.
   * @returns Grant based on the provided Login Challenge.
   */
  public async findGrantByLoginChallenge(loginChallenge: string): Promise<Grant | null> {
    return this._findGrantByLoginChallenge(loginChallenge, null);
  }

  /**
   * Gets a JSON Web Key from the Identity Provider based on the provided Key ID.
   *
   * @param id JSON Web Key ID.
   * @returns JSON Web Key of the Identity Provider based on the provided Key ID.
   */
  public async findJsonWebKeyByKeyId(id: string): Promise<JsonWebKey | null> {
    return this.jsonWebKeySet.find((jsonWebKey) => jsonWebKey.kid === id);
  }

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Identifier of the Session.
   * @returns Session based on the provided Identifier.
   */
  public async findSessionById(id: string): Promise<Session | null> {
    return this._findSessionById(id, null, null);
  }

  /**
   * Searches the application's storage for a User containing the provided Identifier.
   *
   * @param id Identifier of the User.
   * @returns User based on the provided Identifier.
   */
  public async findUserById(id: string): Promise<User | null> {
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
      claims.email_verified = user['email_verified'] as boolean;
    }

    if (scopes.includes('phone')) {
      claims.phone_number = user['phone_number'] as string;
      claims.phone_number_verified = user['phone_number_verified'] as boolean;
    }

    if (scopes.includes('address')) {
      Object.assign<AddressClaimParameters, AddressClaimParameters>(
        claims.address!,
        jsonParse(user['address'] as string) as AddressClaimParameters,
      );
    }

    return removeNullishValues(claims);
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
    const sql = 'UPDATE sessions SET active_login_id = NULL WHERE id = $id;';
    this.database.prepare(sql).run({ id: toUUIDBuffer(session.id) });
  }

  /**
   * Authenticates the provided User and saves its Login to the Session of the Grant.
   *
   * *Note: This method must be executed inside an atomic() operation.*
   *
   * @param user User to be Authenticated.
   * @param client Client requesting Authorization.
   * @param session Session where the Login will be recorded.
   * @param amr Authentication Methods used in the Authentication.
   * @param acr Authentication Context Class Reference satisfied by the Authentication Process.
   */
  public async login(user: User, client: Client, session: Session, amr: string[], acr: string | null): Promise<void> {
    const now = Math.ceil(Date.now() / 1000);

    const loginSql = `
    INSERT INTO logins
      (id, amr, acr, created_at, expires_at, user_id, session_id)
    VALUES
      ($id, $amr, $acr, $created_at, $expires_at, $user_id, $session_id);
    `;

    const loginClientSql = 'INSERT INTO logins_clients (login_id, client_id) VALUES ($login_id, $client_id);';

    const sessionSql = 'UPDATE sessions SET active_login_id = $active_login_id WHERE id = $id;';

    const loginId = toUUIDBuffer(randomUUIDv7());

    this.database.prepare(loginSql).run({
      id: loginId,
      amr: jsonStringify(amr),
      acr,
      created_at: Math.ceil(new Date(now).getTime() / 1000),
      expires_at: Math.ceil(new Date(now).getTime() / 1000) + 7776000,
      user_id: toUUIDBuffer(user.id),
      session_id: toUUIDBuffer(session.id),
    });

    this.database.prepare(loginClientSql).run({ login_id: loginId, client_id: toUUIDBuffer(client.id) });
    this.database.prepare(sessionSql).run({ active_login_id: loginId, id: toUUIDBuffer(session.id) });
  }

  /**
   * Logs out the Authenticated User represented by the provided Login.
   *
   * *Note: This method must be executed inside an atomic() operation.*
   *
   * @param login Login to be removed.
   * @param _session Session of the User-Agent.
   */
  public async logout(login: Login, _session: Session): Promise<void> {
    const sql = 'DELETE FROM logins WHERE id = $id;';
    this.database.prepare(sql).run({ id: toUUIDBuffer(login.id) });
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
   * Persists the provided Grant into the application's storage.
   *
   * @param grant Grant to be persisted.
   */
  public async saveGrant(grant: Grant): Promise<void> {
    const sql = 'UPDATE grants SET interactions = $interactions, consent_id = $consent_id WHERE id = $id;';

    this.database.prepare(sql).run({
      interactions: jsonStringify(grant.interactions),
      consent_id: grant.consent ? toUUIDBuffer(grant.consent.id) : null,
      id: toUUIDBuffer(grant.id),
    });
  }

  /**
   * Persists the provided Login into the application's storage.
   *
   * @param login Login to be persisted.
   */
  public async saveLogin(login: Login): Promise<void> {
    const sql = 'INSERT INTO logins_clients (login_id, client_id) VALUES ($login_id, $client_id);';

    this.database
      .prepare(sql)
      .run({ login_id: toUUIDBuffer(login.id), client_id: toUUIDBuffer(login.clients.at(-1)!.id) });
  }

  /**
   * Persists the provided Session into the application's storage.
   *
   * @param session Session to be persisted.
   */
  public async saveSession(session: Session): Promise<void> {
    const sql = 'UPDATE sessions SET active_login_id = $active_login_id WHERE id = $id;';

    this.database
      .prepare(sql)
      .run({ active_login_id: toUUIDBuffer(session.activeLogin!.id), id: toUUIDBuffer(session.id) });
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

  // #region Helper Methods.
  private _findClientById(id: string): Client | null {
    const clientSql = `
      SELECT id, name, type, profile, redirect_uris, response_types, scopes, authentication_method,
             home_uri, logo_uri, contacts, policy_uri, tos_uri, jwks_uri, jwks, subject_type,
             sector_identifier_uri, id_token_signed_response_algorithm, id_token_encrypted_response_key_wrap,
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
      authenticationMethod: clientParameters['authentication_method']!.toString() as ClientAuthenticationName,
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

  private _findGrantByConsentChallenge(consentChallenge: string, session: Session | null): Grant | null {
    const sql = `
      SELECT id, login_challenge, consent_challenge, parameters, interactions,
             created_at, expires_at, client_id, session_id, consent_id
      FROM consents WHERE consent_challenge = $consent_challenge;
      `;

    const parameters = this.database.prepare(sql).get({ consent_challenge: Buffer.from(consentChallenge, 'hex') });

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

  private _findGrantByLoginChallenge(loginChallenge: string, session: Session | null): Grant | null {
    const sql = `
      SELECT id, login_challenge, consent_challenge, parameters, interactions,
             created_at, expires_at, client_id, session_id, consent_id
      FROM consents WHERE login_challenge = $login_challenge;
      `;

    const parameters = this.database.prepare(sql).get({ login_challenge: Buffer.from(loginChallenge, 'hex') });

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

function toUUIDString(data: Uint8Array): string {
  return Buffer.from(data)
    .toString('hex')
    .replace(/^([\d\w]{8})([\d\w]{4})([\d\w]{4})([\d\w]{4})([\d\w]{12})/i, '$1-$2-$3-$4-$5');
}

function toUUIDBuffer(data: string): Buffer {
  return Buffer.from(data.replaceAll('-', ''), 'hex');
}
