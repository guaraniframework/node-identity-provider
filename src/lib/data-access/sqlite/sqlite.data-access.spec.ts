import { Buffer } from 'buffer';
import { randomUUIDv7 } from 'crypto';
import fs from 'fs';
import { ClientRequest } from 'http';
import https from 'https';
import { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import path from 'path';
import { PassThrough } from 'stream';

import { getContainer } from '@guarani/di';
import { JsonWebKey, JsonWebKeyParameters, JsonWebKeySet, jwks } from '@guarani/jose';
import { jsonStringify } from '@guarani/primitives';

import { UserinfoClaimsParameters } from '../../claims/userinfo/userinfo.claims.parameters';
import { CONTAINER } from '../../constants';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { PKCE } from '../../pkces/pkce';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { SQLiteDataAccess } from './sqlite.data-access';

jest.mock('../../loggers/logger');

describe('SQLite Data Access', () => {
  let dataAccess: SQLiteDataAccess;
  const container = getContainer(CONTAINER);

  let database: DatabaseSync;
  let jsonWebKeySet: JsonWebKeySet;

  const loggerMock = jest.mocked(Logger.prototype);

  const pkceMock = jest.mocked<PKCE>(
    Object.assign<PKCE, Partial<PKCE>>(Reflect.construct(PKCE, []), { name: 'plain' }),
  );

  let databaseExecSpy: jest.SpyInstance;

  beforeEach(async () => {
    jsonWebKeySet = await jwks.create({
      keys: [
        {
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'aLLPBvu0m2zeDGU6Bsd_jc3hNJd0zE6MG4xENqHi5xM',
          d: '4cCY4C_0woQOaTN9gwyVca3_Cf9GHUp48mdskkHwMyU',
          use: 'sig',
          kid: '6c0690cb-025c-4f11-97cc-301b3af64657',
        },
        {
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'RB3LvKwogf_dAYCugq4FpWv7fU_QRqZtTQ5rPCeN9p4',
          d: '8fNTJd2ZYSCF_2PsOftMnix8u7K55j34Y9TamOtgA0k',
          use: 'enc',
          kid: '13f886b4-41f9-4450-a595-9d5f15df1d6f',
        },
      ],
    });

    database = new DatabaseSync(':memory:');

    databaseExecSpy = jest.spyOn(database, 'exec');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DatabaseSync).toValue(database);
    container.bind(JsonWebKeySet).toValue(jsonWebKeySet);
    container.bind(SQLiteDataAccess).toSelf().asSingleton();

    dataAccess = container.resolve(SQLiteDataAccess);
  });

  afterEach(() => {
    database.close();
    container.clear();

    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should warn about the usage of the Default Node Identity Server.', () => {
      expect(loggerMock.warn).toHaveBeenCalledExactlyOnceWith(
        '[SQLiteDataAccess] Using the default SQLite Data Access. This is only recommended for development environments.',
        'cb97e86b-bc91-468f-919e-611df74dcc32',
        null,
      );
    });
  });

  describe('atomic()', () => {
    let callback: jest.Mock;

    beforeEach(() => {
      callback = jest.fn();
    });

    it('should execute and rollback the provided callback as an atomic operation.', async () => {
      const error = new Error('Database Error.');

      callback.mockRejectedValueOnce(error);

      await expect(dataAccess.atomic(callback)).rejects.toThrow(error);

      expect(databaseExecSpy).toHaveBeenNthCalledWith(1, 'PRAGMA foreign_keys = ON;');
      expect(databaseExecSpy).toHaveBeenNthCalledWith(2, 'BEGIN TRANSACTION;');
      expect(databaseExecSpy).toHaveBeenNthCalledWith(3, 'ROLLBACK;');

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SQLiteDataAccess] Failed atomic()',
        '3f97f5da-0764-48c6-89f4-21956038c5ec',
        null,
        error,
      );
    });

    it('should execute and commit the provided callback as an atomic operation.', async () => {
      callback.mockResolvedValueOnce([]);

      await expect(dataAccess.atomic(callback)).resolves.toStrictEqual([]);

      expect(databaseExecSpy).toHaveBeenNthCalledWith(1, 'PRAGMA foreign_keys = ON;');
      expect(databaseExecSpy).toHaveBeenNthCalledWith(2, 'BEGIN TRANSACTION;');
      expect(databaseExecSpy).toHaveBeenNthCalledWith(3, 'COMMIT;');
    });
  });

  describe('createAccessToken()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create an Access Token without a User.', async () => {
      let accessToken!: AccessToken;

      const scopes = await dataAccess.getScopes();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;

      await expect(async () => {
        accessToken = await dataAccess.createAccessToken(scopes, client, null);
      }).resolves.not.toThrow();

      expect(accessToken).toBeInstanceOf(AccessToken);
      expect(accessToken.scopes).toStrictEqual(scopes);
      expect(accessToken.client).toStrictEqual(client);
    });

    it('should create an Access Token with a User.', async () => {
      let accessToken!: AccessToken;

      const scopes = await dataAccess.getScopes();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user: User = Object.assign<User, Partial<User>>(new User(), { id: '16907c32-687b-493c-85ba-f41f2c9d4daa' });

      await expect(async () => {
        accessToken = await dataAccess.createAccessToken(scopes, client, user);
      }).resolves.not.toThrow();

      expect(accessToken).toBeInstanceOf(AccessToken);
      expect(accessToken.scopes).toStrictEqual(scopes);
      expect(accessToken.client).toStrictEqual(client);
      expect(accessToken.user).toStrictEqual(user);
    });
  });

  describe('createAuthorizationCode()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create an Authorization Code.', async () => {
      let authorizationCode!: AuthorizationCode;

      const loginId = randomUUIDv7();
      const consentId = randomUUIDv7();
      const userId = '16907c32-687b-493c-85ba-f41f2c9d4daa';
      const clientId = 'b1eeace9-2b0c-468e-a444-733befc3b35d';

      const insertLoginSql = 'INSERT INTO logins (id, user_id, session_id) VALUES ($id, $user_id, $session_id)';
      const insertLoginsClientsSql = 'INSERT INTO logins_clients (login_id, client_id) VALUES ($login_id, $client_id)';

      const insertConsentSql = 'INSERT INTO consents (id, client_id, user_id) VALUES ($id, $client_id, $user_id)';
      const insertConsentScopes =
        'INSERT INTO consent_scopes (consent_id, scope_id) SELECT c.id AS consent_id, s.id AS scope_id ' +
        'FROM scopes AS s JOIN consents AS c WHERE c.id = $consent_id';

      const updateSessionSql = 'UPDATE sessions SET active_login_id = $active_login_id WHERE id = $id';

      const session = await dataAccess.createSession();

      database
        .prepare(insertLoginSql)
        .run({ id: toUUIDBuffer(loginId), user_id: toUUIDBuffer(userId), session_id: toUUIDBuffer(session.id) });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(loginId), client_id: toUUIDBuffer(clientId) });

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(consentId), client_id: toUUIDBuffer(clientId), user_id: toUUIDBuffer(userId) });

      database.prepare(insertConsentScopes).run({ consent_id: toUUIDBuffer(consentId) });
      database.prepare(updateSessionSql).run({ active_login_id: toUUIDBuffer(loginId), id: toUUIDBuffer(session.id) });

      const codeChallenge = 'code_challenge';
      const codeChallengeMethod = pkceMock;
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: loginId });
      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), { id: consentId });

      await expect(async () => {
        authorizationCode = await dataAccess.createAuthorizationCode(
          codeChallenge,
          codeChallengeMethod,
          login,
          consent,
        );
      }).resolves.not.toThrow();

      expect(authorizationCode).toBeInstanceOf(AuthorizationCode);

      expect(authorizationCode.codeChallenge).toBe(codeChallenge);
      expect(authorizationCode.codeChallengeMethod).toBe(codeChallengeMethod.name);
      expect(authorizationCode.login.id).toBe(loginId);
      expect(authorizationCode.consent.id).toBe(consentId);
    });
  });

  describe('createConsent()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create a Consent.', async () => {
      let consent!: Consent;

      const scopes = await dataAccess.getScopes();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      await expect(async () => {
        consent = await dataAccess.createConsent(scopes, client, user);
      }).resolves.not.toThrow();

      expect(consent).toBeInstanceOf(Consent);
      expect(consent.scopes).toStrictEqual(scopes);
      expect(consent.client).toStrictEqual(client);
      expect(consent.user).toStrictEqual(user);
    });
  });

  describe('createGrant()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create a Grant.', async () => {
      let grant!: Grant;

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();

      await expect(async () => {
        grant = await dataAccess.createGrant(parameters, client, session);
      }).resolves.not.toThrow();

      expect(grant).toBeInstanceOf(Grant);

      expect(grant.parameters).toStrictEqual(parameters);
      expect(grant.client).toStrictEqual(client);
      expect(grant.session).toStrictEqual(session);
      expect(grant.consent).toBeNull();
    });
  });

  describe('createLogin()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create a Login.', async () => {
      let login!: Login;

      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();

      await expect(async () => {
        login = await dataAccess.createLogin(user, client, session, ['pwd', 'sms'], 'urn:guarani:acr:2fa');
      }).resolves.not.toThrow();

      expect(login).toBeInstanceOf(Login);

      expect(login.amr).toStrictEqual<string[]>(expect.arrayContaining(['pwd', 'sms']));
      expect(login.acr).toBe('urn:guarani:acr:2fa');
      expect(login.user).toStrictEqual(user);
      expect(login.session).toStrictEqual(session);
      expect(login.clients).toStrictEqual<Client[]>(expect.arrayContaining([client]));
    });

    it('should create a Login without Authentication Methods and Authentication Context Class Reference.', async () => {
      let login!: Login;

      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();

      await expect(async () => {
        login = await dataAccess.createLogin(user, client, session, [], null);
      }).resolves.not.toThrow();

      expect(login).toBeInstanceOf(Login);

      expect(login.amr).toBeEmpty();
      expect(login.acr).toBeNull();
      expect(login.user).toStrictEqual(user);
      expect(login.session).toStrictEqual(session);
      expect(login.clients).toStrictEqual<Client[]>(expect.arrayContaining([client]));

      expect(session.activeLogin).toBe(login);
      expect(session.logins).toContain(login);
    });
  });

  describe('createSession()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create a Session.', async () => {
      let session!: Session;

      await expect(async () => {
        session = await dataAccess.createSession();
      }).resolves.not.toThrow();

      expect(session).toBeInstanceOf(Session);

      expect(session.activeLogin).toBeNull();
      expect(session.logins).toBeArrayOfSize(0);
      expect(session.grant).toBeNull();
    });
  });

  describe('createUser()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should create a User with minimal parameters.', async () => {
      let user!: User;

      const data: NodeJS.Dict<string> = {
        password: 'ultrapassword',
        given_name: 'Theodore',
        family_name: 'Simpson',
        email: 'theo.simpson@email.com',
        birthdate: '2007-07-23',
        phone_number: '+1 (212) 555-0123',
        street_address: '350 5th Ave',
      };

      await expect(async () => {
        user = await dataAccess.createUser(data);
      }).resolves.not.toThrow();

      await expect(dataAccess.findUserById(user.id)).resolves.toStrictEqual<User>(expect.objectContaining<User>(user));
    });

    it('should create a User with all parameters.', async () => {
      let user!: User;

      const data: NodeJS.Dict<string> = {
        password: 'ultrapassword',
        given_name: 'Theodore',
        middle_name: 'Earl',
        family_name: 'Simpson',
        nickname: 'theo',
        preferred_username: 'theo.earl',
        profile: 'https://social.example.com/users/theo',
        picture: 'https://social.example.com/users/theo/picture.png',
        website: 'https://theo-blog.example.com',
        email: 'theo.simpson@email.com',
        gender: 'male',
        birthdate: '2007-07-23',
        zoneinfo: 'America/New_York',
        locale: 'en-US',
        phone_number: '+1 (212) 555-0123',
        locality: 'New York',
        region: 'NY',
        postal_code: '10118',
        country: 'United States',
      };

      await expect(async () => {
        user = await dataAccess.createUser(data);
      }).resolves.not.toThrow();

      await expect(dataAccess.findUserById(user.id)).resolves.toStrictEqual<User>(expect.objectContaining<User>(user));
    });
  });

  describe('findClientById()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no Client is found by the provided Identifier.', async () => {
      await expect(dataAccess.findClientById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });

    it('should return the Client of the provided Identifier.', async () => {
      let client1!: Client;
      let client2!: Client;

      await expect(
        async () => (client1 = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!),
      ).resolves.toBeInstanceOf(Client);

      await expect(
        async () => (client2 = (await dataAccess.findClientById('922e0d5e-08ba-4b0d-8068-fde37f2c3604'))!),
      ).resolves.toBeInstanceOf(Client);

      const scopes = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access', 'foo', 'bar', 'baz', 'qux'];

      expect(client1.secrets.map((secret) => secret.secret)).toStrictEqual(['z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX']);
      expect(client1.scopes.map((scope) => scope.name)).toStrictEqual(expect.arrayContaining(scopes));

      expect(client2.secrets.map((secret) => secret.secret)).toStrictEqual(['EHW-xzn8-CVIz9DnN2UjxIZpHo1hTO3h']);
      expect(client2.scopes.map((scope) => scope.name)).toStrictEqual(expect.arrayContaining(scopes));
    });
  });

  describe('findConsentByClientAndUser()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no Consent is found by the provided Client and User.', async () => {
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      await expect(dataAccess.findConsentByClientAndUser(client, user)).resolves.toBeNull();
    });

    it('should return the Consent of the provided Client and User with an expiring date.', async () => {
      const id = randomUUIDv7();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      const insertConsentSql =
        'INSERT INTO consents (id, expires_at, client_id, user_id) VALUES ($id, $expires_at, $client_id, $user_id)';

      const insertConsentScopes =
        'INSERT INTO consent_scopes (consent_id, scope_id) SELECT c.id AS consent_id, s.id AS scope_id ' +
        'FROM scopes AS s JOIN consents AS c WHERE c.id = $consent_id';

      database
        .prepare(insertConsentSql.replace('$expires_at', "(unixepoch('now', '+120 days'))"))
        .run({ id: toUUIDBuffer(id), client_id: toUUIDBuffer(client.id), user_id: toUUIDBuffer(user.id) });

      database.prepare(insertConsentScopes).run({ consent_id: toUUIDBuffer(id) });

      await expect(dataAccess.findConsentByClientAndUser(client, user)).resolves.toStrictEqual<Consent>(
        expect.objectContaining<Consent>({
          id,
          scopes: expect.arrayContaining(await dataAccess.getScopes()),
          createdAt: expect.toBeDate(),
          expiresAt: expect.toBeDate(),
          client,
          user,
        }),
      );
    });

    it('should return the Consent of the provided Client and User.', async () => {
      const id = randomUUIDv7();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      const insertConsentSql = 'INSERT INTO consents (id, client_id, user_id) VALUES ($id, $client_id, $user_id)';
      const insertConsentScopes =
        'INSERT INTO consent_scopes (consent_id, scope_id) SELECT c.id AS consent_id, s.id AS scope_id ' +
        'FROM scopes AS s JOIN consents AS c WHERE c.id = $consent_id';

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(id), client_id: toUUIDBuffer(client.id), user_id: toUUIDBuffer(user.id) });

      database.prepare(insertConsentScopes).run({ consent_id: toUUIDBuffer(id) });

      await expect(dataAccess.findConsentByClientAndUser(client, user)).resolves.toStrictEqual<Consent>(
        expect.objectContaining<Consent>({
          id,
          scopes: expect.arrayContaining(await dataAccess.getScopes()),
          createdAt: expect.toBeDate(),
          expiresAt: expect.toBeNil(),
          client,
          user,
        }),
      );
    });
  });

  describe('findGrantByConsentChallenge()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no Grant is found by the provided Consent Challenge.', async () => {
      await expect(dataAccess.findGrantByConsentChallenge('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });

    it('should return the Grant of the provided Consent Challenge.', async () => {
      let grant!: Grant;

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();
      const { id: grantId, consentChallenge } = await dataAccess.createGrant(parameters, client, session);

      await expect(async () => {
        grant = (await dataAccess.findGrantByConsentChallenge(consentChallenge))!;
      }).resolves.not.toThrow();

      expect(grant).toBeInstanceOf(Grant);

      expect(grant.id).toBe(grantId);
      expect(grant.consentChallenge).toBe(consentChallenge);
      expect(grant.parameters).toStrictEqual(parameters);
      expect(grant.client).toStrictEqual(client);
      expect(grant.session).toStrictEqual(session);
      expect(grant.consent).toBeNull();
    });

    it('should return the Grant of the provided Consent Challenge with a Consent.', async () => {
      let grant!: Grant;

      const consentId = randomUUIDv7();

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const session = await dataAccess.createSession();

      const { id: grantId, consentChallenge } = await dataAccess.createGrant(parameters, client, session);

      const insertConsentSql =
        "INSERT INTO consents (id, expires_at, client_id, user_id) VALUES ($id, (unixepoch('now', '+120 days')), $client_id, $user_id)";

      const updateGrantSql = 'UPDATE grants SET consent_id = $consent_id WHERE id = $id';

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(consentId), client_id: toUUIDBuffer(client.id), user_id: toUUIDBuffer(user.id) });

      database.prepare(updateGrantSql).run({ consent_id: toUUIDBuffer(consentId), id: toUUIDBuffer(grantId) });

      await expect(async () => {
        grant = (await dataAccess.findGrantByConsentChallenge(consentChallenge))!;
      }).resolves.not.toThrow();

      expect(grant).toBeInstanceOf(Grant);

      expect(grant.id).toBe(grantId);
      expect(grant.consentChallenge).toBe(consentChallenge);
      expect(grant.parameters).toStrictEqual(parameters);
      expect(grant.client.id).toBe(client.id);
      expect(grant.session.id).toBe(session.id);
      expect(grant.consent!.id).toBe(consentId);
    });
  });

  describe('findGrantByLoginChallenge()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no Grant is found by the provided Login Challenge.', async () => {
      await expect(dataAccess.findGrantByLoginChallenge('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });

    it('should return the Grant of the provided Login Challenge.', async () => {
      let grant!: Grant;

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();
      const { id: grantId, loginChallenge } = await dataAccess.createGrant(parameters, client, session);

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant).toBeInstanceOf(Grant);

      expect(grant.id).toBe(grantId);
      expect(grant.loginChallenge).toBe(loginChallenge);
      expect(grant.parameters).toStrictEqual(parameters);
      expect(grant.client).toStrictEqual(client);
      expect(grant.session).toStrictEqual(session);
      expect(grant.consent).toBeNull();
    });

    it('should return the Grant of the provided Login Challenge with a Consent.', async () => {
      let grant!: Grant;

      const consentId = randomUUIDv7();

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const session = await dataAccess.createSession();

      const { id: grantId, loginChallenge } = await dataAccess.createGrant(parameters, client, session);

      const insertConsentSql =
        "INSERT INTO consents (id, expires_at, client_id, user_id) VALUES ($id, (unixepoch('now', '+120 days')), $client_id, $user_id)";

      const updateGrantSql = 'UPDATE grants SET consent_id = $consent_id WHERE id = $id';

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(consentId), client_id: toUUIDBuffer(client.id), user_id: toUUIDBuffer(user.id) });

      database.prepare(updateGrantSql).run({ consent_id: toUUIDBuffer(consentId), id: toUUIDBuffer(grantId) });

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant).toBeInstanceOf(Grant);

      expect(grant.id).toBe(grantId);
      expect(grant.loginChallenge).toBe(loginChallenge);
      expect(grant.parameters).toStrictEqual(parameters);
      expect(grant.client.id).toBe(client.id);
      expect(grant.session.id).toBe(session.id);
      expect(grant.consent!.id).toBe(consentId);
    });
  });

  describe('findJsonWebKeyByKeyId()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when a JSON Web Key with the provided Identifier is not registered at the Identity Provider.', async () => {
      await expect(dataAccess.findJsonWebKeyByKeyId!('0f73294d-dfdb-4380-bdde-ed0efa568fba')).resolves.toBeNull();
    });

    it('should return the JSON Web Key of the Identity Provider based on the provided Identifier.', async () => {
      await expect(dataAccess.findJsonWebKeyByKeyId!('6c0690cb-025c-4f11-97cc-301b3af64657')).resolves.toBe(
        jsonWebKeySet.keys[0]!,
      );
    });
  });

  describe('findSessionById()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no Session is found by the provided Identifier.', async () => {
      await expect(dataAccess.findSessionById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });

    it('should return the Session of the provided Identifier as a fresh Session.', async () => {
      let session!: Session;

      const sessionId = randomUUIDv7();

      const insertSessionSql = 'INSERT INTO sessions (id, active_login_id, grant_id) VALUES ($id, NULL, NULL)';
      database.prepare(insertSessionSql).run({ id: toUUIDBuffer(sessionId) });

      await expect(async () => (session = (await dataAccess.findSessionById(sessionId))!)).resolves.not.toThrow();

      expect(session).toBeInstanceOf(Session);

      expect(session.activeLogin).toBeNull();
      expect(session.logins).toBeArrayOfSize(0);
      expect(session.grant).toBeNull();
    });

    it('should return the Session of the provided Identifier.', async () => {
      let session!: Session;

      const sessionId = randomUUIDv7();
      const login1Id = randomUUIDv7();
      const login2Id = randomUUIDv7();
      const consentId = randomUUIDv7();
      const grantId = randomUUIDv7();
      const userId = '16907c32-687b-493c-85ba-f41f2c9d4daa';
      const clientId = 'b1eeace9-2b0c-468e-a444-733befc3b35d';

      const insertSessionSql = 'INSERT INTO sessions (id, active_login_id, grant_id) VALUES ($id, NULL, NULL)';

      const insertLoginSql =
        'INSERT INTO logins (id, expires_at, user_id, session_id) VALUES ($id, $expires_at, $user_id, $session_id)';

      const insertLoginsClientsSql = 'INSERT INTO logins_clients (login_id, client_id) VALUES ($login_id, $client_id)';

      const insertConsentSql = 'INSERT INTO consents (id, client_id, user_id) VALUES ($id, $client_id, $user_id)';
      const insertConsentScopes =
        'INSERT INTO consent_scopes (consent_id, scope_id) SELECT c.id AS consent_id, s.id AS scope_id ' +
        'FROM scopes AS s JOIN consents AS c WHERE c.id = $consent_id';

      const insertGrantSql =
        'INSERT INTO grants (id, login_challenge, consent_challenge, parameters, client_id, session_id, consent_id) ' +
        'VALUES ($id, $login_challenge, $consent_challenge, $parameters, $client_id, $session_id, $consent_id)';

      const updateSessionSql =
        'UPDATE sessions SET active_login_id = $active_login_id, grant_id = $grant_id WHERE id = $id';

      database.prepare(insertSessionSql).run({ id: toUUIDBuffer(sessionId) });

      database.prepare(insertLoginSql).run({
        id: toUUIDBuffer(login1Id),
        expires_at: null,
        user_id: toUUIDBuffer(userId),
        session_id: toUUIDBuffer(sessionId),
      });

      database.prepare(insertLoginSql.replace('$expires_at', "(unixepoch('now', '+7 days'))")).run({
        id: toUUIDBuffer(login2Id),
        user_id: toUUIDBuffer(userId),
        session_id: toUUIDBuffer(sessionId),
      });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(login1Id), client_id: toUUIDBuffer(clientId) });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(login2Id), client_id: toUUIDBuffer(clientId) });

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(consentId), client_id: toUUIDBuffer(clientId), user_id: toUUIDBuffer(userId) });

      database.prepare(insertConsentScopes).run({ consent_id: toUUIDBuffer(consentId) });

      database.prepare(insertGrantSql).run({
        id: toUUIDBuffer(grantId),
        login_challenge: 'login_challenge',
        consent_challenge: 'consent_challenge',
        parameters: '{}',
        client_id: toUUIDBuffer(clientId),
        session_id: toUUIDBuffer(sessionId),
        consent_id: toUUIDBuffer(consentId),
      });

      database
        .prepare(updateSessionSql)
        .run({ active_login_id: toUUIDBuffer(login1Id), grant_id: toUUIDBuffer(grantId), id: toUUIDBuffer(sessionId) });

      await expect(async () => (session = (await dataAccess.findSessionById(sessionId))!)).resolves.not.toThrow();

      expect(session).toBeInstanceOf(Session);

      expect(session.activeLogin!.id).toBe(login1Id);
      expect(session.activeLogin!.session).toBe(session);
      expect(session.activeLogin!.user.id).toBe(userId);
      expect(session.activeLogin!.clients[0]!.id).toBe(clientId);
      expect(session.logins[0]!.id).toBe(login1Id);
      expect(session.logins[1]!.id).toBe(login2Id);
      expect(session.grant!.id).toBe(grantId);
      expect(session.grant!.client.id).toBe(clientId);
      expect(session.grant!.session.id).toBe(sessionId);
      expect(session.grant!.consent!.id).toBe(consentId);
    });

    it('should return the Session of the provided Identifier with a null Consent.', async () => {
      let session!: Session;

      const sessionId = randomUUIDv7();
      const login1Id = randomUUIDv7();
      const login2Id = randomUUIDv7();
      const grantId = randomUUIDv7();
      const userId = '16907c32-687b-493c-85ba-f41f2c9d4daa';
      const clientId = 'b1eeace9-2b0c-468e-a444-733befc3b35d';

      const insertSessionSql = 'INSERT INTO sessions (id, active_login_id, grant_id) VALUES ($id, NULL, NULL)';

      const insertLoginSql =
        'INSERT INTO logins (id, expires_at, user_id, session_id) VALUES ($id, $expires_at, $user_id, $session_id)';

      const insertLoginsClientsSql = 'INSERT INTO logins_clients (login_id, client_id) VALUES ($login_id, $client_id)';

      const insertGrantSql =
        'INSERT INTO grants (id, login_challenge, consent_challenge, parameters, client_id, session_id, consent_id) ' +
        'VALUES ($id, $login_challenge, $consent_challenge, $parameters, $client_id, $session_id, $consent_id)';

      const updateSessionSql =
        'UPDATE sessions SET active_login_id = $active_login_id, grant_id = $grant_id WHERE id = $id';

      database.prepare(insertSessionSql).run({ id: toUUIDBuffer(sessionId) });

      database.prepare(insertLoginSql).run({
        id: toUUIDBuffer(login1Id),
        expires_at: null,
        user_id: toUUIDBuffer(userId),
        session_id: toUUIDBuffer(sessionId),
      });

      database.prepare(insertLoginSql.replace('$expires_at', "(unixepoch('now', '+7 days'))")).run({
        id: toUUIDBuffer(login2Id),
        user_id: toUUIDBuffer(userId),
        session_id: toUUIDBuffer(sessionId),
      });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(login1Id), client_id: toUUIDBuffer(clientId) });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(login2Id), client_id: toUUIDBuffer(clientId) });

      database.prepare(insertGrantSql).run({
        id: toUUIDBuffer(grantId),
        login_challenge: 'login_challenge',
        consent_challenge: 'consent_challenge',
        parameters: '{}',
        client_id: toUUIDBuffer(clientId),
        session_id: toUUIDBuffer(sessionId),
      });

      database
        .prepare(updateSessionSql)
        .run({ active_login_id: toUUIDBuffer(login1Id), grant_id: toUUIDBuffer(grantId), id: toUUIDBuffer(sessionId) });

      await expect(async () => (session = (await dataAccess.findSessionById(sessionId))!)).resolves.not.toThrow();

      expect(session).toBeInstanceOf(Session);

      expect(session.activeLogin!.id).toBe(login1Id);
      expect(session.activeLogin!.session).toBe(session);
      expect(session.activeLogin!.user.id).toBe(userId);
      expect(session.activeLogin!.clients[0]!.id).toBe(clientId);
      expect(session.logins[0]!.id).toBe(login1Id);
      expect(session.logins[1]!.id).toBe(login2Id);
      expect(session.grant!.id).toBe(grantId);
      expect(session.grant!.client.id).toBe(clientId);
      expect(session.grant!.session.id).toBe(sessionId);
      expect(session.grant!.consent).toBeNull();
    });
  });

  describe('findUserById()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return null when no User is found by the provided Identifier.', async () => {
      await expect(dataAccess.findUserById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    });

    it('should return the User of the provided Identifier.', async () => {
      await expect(dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa')).resolves.toBeInstanceOf(User);
      await expect(dataAccess.findUserById('5abe9a9c-c868-4f12-8c76-f34dec7e1cc0')).resolves.toBeInstanceOf(User);
    });
  });

  describe('getClientAssertionSignJsonWebKey()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return the Client Assertion Sign JSON Web Key of the Identity Provider.', async () => {
      await expect(dataAccess.getClientAssertionSignJsonWebKey!()).resolves.toBe(jsonWebKeySet.keys[0]!);
    });
  });

  describe('getClientAssertionUnwrapJsonWebKey()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return the Client Assertion Unwrap JSON Web Key of the Identity Provider.', async () => {
      await expect(dataAccess.getClientAssertionUnwrapJsonWebKey!()).resolves.toBe(jsonWebKeySet.keys[1]!);
    });
  });

  describe('getClientWrapJsonWebKey()', () => {
    let clientJsonWebKeyParameters!: JsonWebKeyParameters;
    let clientJsonWebKeySet!: JsonWebKeySet;

    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();

      clientJsonWebKeyParameters = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'aNoALKSUE1UsotuZvHUj1HEGqhpzLtsSTLmkBITDMAk',
        use: 'enc',
        kid: '1360a8dd-5df9-4c22-a347-3ea738656afb',
      };

      clientJsonWebKeySet = await jwks.create({ keys: [clientJsonWebKeyParameters] });
    });

    it("should throw when failing to get a Wrap JSON Web Key from the Client's JSON Web Key Set.", async () => {
      clientJsonWebKeySet.keys[0]!.parameters.use = 'sig';

      const streamMock = new PassThrough();

      jest.spyOn(https, 'get').mockImplementationOnce((_: any, callback: any) => {
        callback(streamMock);

        streamMock.write(Buffer.from(jsonStringify(clientJsonWebKeySet.toJSON()), 'utf8'));
        streamMock.end();

        return { on: jest.fn(), end: jest.fn() } as unknown as ClientRequest;
      });

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;

      const error = new InvalidClientError('Failed to obtain a valid JSON Web Key from the Client.');

      await expect(dataAccess.getClientWrapJsonWebKey!(client)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.description,
      );
    });

    it("should return the Client's Wrap JSON Web Key from its JSON Web Key Set.", async () => {
      let jsonWebKey!: JsonWebKey;

      const streamMock = new PassThrough();

      jest.spyOn(https, 'get').mockImplementationOnce((_: any, callback: any) => {
        callback(streamMock);

        streamMock.write(Buffer.from(jsonStringify(clientJsonWebKeySet.toJSON()), 'utf8'));
        streamMock.end();

        return { on: jest.fn(), end: jest.fn() } as unknown as ClientRequest;
      });

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;

      await expect(async () => {
        jsonWebKey = await dataAccess.getClientWrapJsonWebKey!(client);
      }).resolves.not.toThrow();

      expect(jsonWebKey).toBeInstanceOf(JsonWebKey);
      expect(jsonWebKey.parameters).toStrictEqual(clientJsonWebKeyParameters);
    });
  });

  describe('getScopes()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return all Scopes.', async () => {
      let scopes!: Scope[];

      await expect(async () => (scopes = await dataAccess.getScopes())).resolves.not.toThrow();

      expect(scopes).toSatisfyAll((scope) => scope instanceof Scope);
      expect(scopes).toBeArrayOfSize(10);

      expect(scopes.map((scope) => scope.name)).toStrictEqual(
        expect.arrayContaining([
          'openid',
          'profile',
          'email',
          'phone',
          'address',
          'offline_access',
          'foo',
          'bar',
          'baz',
          'qux',
        ]),
      );
    });
  });

  describe('getScopesByName()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return the requested Scopes.', async () => {
      let scopes!: Scope[];
      const scopesNames: string[] = ['openid', 'profile', 'email', 'foo', 'bar'];

      await expect(async () => (scopes = await dataAccess.getScopesByName(scopesNames))).resolves.not.toThrow();

      expect(scopes).toSatisfyAll((scope) => scope instanceof Scope);
      expect(scopes).toBeArrayOfSize(5);

      expect(scopes.map((scope) => scope.name)).toStrictEqual(scopesNames.sort());
    });
  });

  describe('getSignJsonWebKey()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return the Sign JSON Web Key of the Identity Provider.', async () => {
      await expect(dataAccess.getSignJsonWebKey!()).resolves.toBe(jsonWebKeySet.keys[0]!);
    });
  });

  describe('getUnwrapJsonWebKey()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return the Unwrap JSON Web Key of the Identity Provider.', async () => {
      await expect(dataAccess.getUnwrapJsonWebKey!()).resolves.toBe(jsonWebKeySet.keys[1]!);
    });
  });

  describe('getUserinfo()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should return an empty object as the Userinfo Claims about the requested User.', async () => {
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const scopes: Scope[] = [];

      await expect(dataAccess.getUserinfo!(user, scopes)).resolves.toBeEmptyObject();
    });

    it('should return all the Userinfo Claims about the requested User.', async () => {
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      const scopes = ['openid', 'profile', 'email', 'phone', 'address'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      await expect(dataAccess.getUserinfo!(user, scopes)).resolves.toStrictEqual<UserinfoClaimsParameters>({
        name: user.givenName! + ' ' + user.middleName! + ' ' + user.familyName!,
        given_name: user.givenName!,
        middle_name: user.middleName!,
        family_name: user.familyName!,
        nickname: user.nickname!,
        preferred_username: user.preferredUsername!,
        profile: user.profile!.href,
        picture: user.picture!.href,
        website: user.website!.href,
        email: user.email!,
        email_verified: user.emailVerified!,
        gender: user.gender!,
        birthdate: user.birthdate!,
        zoneinfo: user.zoneinfo!,
        locale: user.locale!,
        phone_number: user.phoneNumber!,
        phone_number_verified: user.phoneNumberVerified!,
        address: {
          formatted: user.address!.streetAddress!,
          street_address: user.address!.streetAddress!,
          locality: user.address!.locality!,
          region: user.address!.region!,
          postal_code: user.address!.postalCode!,
          country: user.address!.country!,
        },
        updated_at: Math.ceil(user.updatedAt!.getTime() / 1000),
      });
    });

    it('should return the basic Userinfo Claims about the requested User.', async () => {
      const user = (await dataAccess.findUserById('5abe9a9c-c868-4f12-8c76-f34dec7e1cc0'))!;

      const scopes = ['openid', 'profile', 'email', 'phone', 'address'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      await expect(dataAccess.getUserinfo!(user, scopes)).resolves.toStrictEqual<UserinfoClaimsParameters>({
        given_name: user.givenName!,
        family_name: user.familyName!,
        email: user.email!,
        email_verified: user.emailVerified!,
        birthdate: user.birthdate!,
        phone_number: user.phoneNumber!,
        phone_number_verified: user.phoneNumberVerified!,
        address: {},
        updated_at: Math.ceil(user.updatedAt!.getTime() / 1000),
      });
    });
  });

  describe('inactivateSessionActiveLogin()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should remove the Active Login of the Session without deleting the Login.', async () => {
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();
      const login = await dataAccess.createLogin(user, client, session, [], null);

      expect(
        database.prepare('SELECT active_login_id FROM sessions WHERE id = $id').get({ id: toUUIDBuffer(session.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>>(
        expect.objectContaining({ active_login_id: Uint8Array.from(toUUIDBuffer(login.id)) }),
      );

      await expect(dataAccess.inactivateSessionActiveLogin(session)).resolves.not.toThrow();

      expect(
        database.prepare('SELECT active_login_id FROM sessions WHERE id = $id').get({ id: toUUIDBuffer(session.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>>(expect.objectContaining({ active_login_id: null }));
    });
  });

  describe('logout()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it("should delete the Login and remove it from the Session's Active Login.", async () => {
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();
      const login = await dataAccess.createLogin(user, client, session, [], null);

      expect(session.logins).toContain(login);

      expect(
        database.prepare('SELECT active_login_id FROM sessions WHERE id = $id').get({ id: toUUIDBuffer(session.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>>(
        expect.objectContaining({ active_login_id: Uint8Array.from(toUUIDBuffer(login.id)) }),
      );

      await expect(dataAccess.logout(login, session)).resolves.not.toThrow();

      expect(
        database.prepare('SELECT active_login_id FROM sessions WHERE id = $id').get({ id: toUUIDBuffer(session.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>>(expect.objectContaining({ active_login_id: null }));

      expect(
        database.prepare('SELECT * FROM logins WHERE id = $id').get({ id: toUUIDBuffer(login.id) }),
      ).toBeUndefined();

      expect(session.logins).not.toContain(login);
    });
  });

  describe('removeConsent()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should delete the Consent.', async () => {
      const id = randomUUIDv7();
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

      const insertConsentSql = 'INSERT INTO consents (id, client_id, user_id) VALUES ($id, $client_id, $user_id)';
      const insertConsentScopes =
        'INSERT INTO consent_scopes (consent_id, scope_id) SELECT c.id AS consent_id, s.id AS scope_id ' +
        'FROM scopes AS s JOIN consents AS c WHERE c.id = $consent_id';

      database
        .prepare(insertConsentSql)
        .run({ id: toUUIDBuffer(id), client_id: toUUIDBuffer(client.id), user_id: toUUIDBuffer(user.id) });

      database.prepare(insertConsentScopes).run({ consent_id: toUUIDBuffer(id) });

      const consent = (await dataAccess.findConsentByClientAndUser(client, user))!;

      await expect(dataAccess.removeConsent(consent)).resolves.not.toThrow();
      await expect(dataAccess.findConsentByClientAndUser(client, user)).resolves.toBeNull();
    });
  });

  describe('removeGrant()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should delete the Consent.', async () => {
      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const session = await dataAccess.createSession();
      const grant = await dataAccess.createGrant(parameters, client, session);

      await expect(dataAccess.removeGrant(grant)).resolves.not.toThrow();

      expect(
        database.prepare('SELECT * FROM grants WHERE id = $id').get({ id: toUUIDBuffer(grant.id) }),
      ).toBeUndefined();
    });
  });

  describe('saveGrant()', () => {
    let parameters!: AuthorizationRequest;
    let client!: Client;
    let session!: Session;

    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();

      parameters = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      session = await dataAccess.createSession();
    });

    it('should not update the provided unchanged Grant.', async () => {
      let grant!: Grant;

      const { loginChallenge } = await dataAccess.createGrant(parameters, client, session);

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant.interactions).toBeArrayOfSize(0);
      expect(grant.consent).toBeNull();

      await dataAccess.saveGrant(grant);

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant.interactions).toBeArrayOfSize(0);
      expect(grant.consent).toBeNull();
    });

    it('should update the provided Grant.', async () => {
      let grant!: Grant;

      const { loginChallenge } = await dataAccess.createGrant(parameters, client, session);

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant.interactions).toBeArrayOfSize(0);
      expect(grant.consent).toBeNull();

      const scopes = await dataAccess.getScopes();
      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const consent = await dataAccess.createConsent(scopes, client, user);

      grant.interactions.push('consent');
      grant.consent = consent;

      await dataAccess.saveGrant(grant);

      await expect(async () => {
        grant = (await dataAccess.findGrantByLoginChallenge(loginChallenge))!;
      }).resolves.not.toThrow();

      expect(grant.interactions).toStrictEqual<InteractionTypeName[]>(['consent']);
      expect(grant.consent.id).toBe(consent.id);
    });
  });

  describe('saveLogin()', () => {
    let user!: User;
    let client1!: Client;
    let client2!: Client;
    let session!: Session;

    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();

      user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      client1 = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      client2 = (await dataAccess.findClientById('922e0d5e-08ba-4b0d-8068-fde37f2c3604'))!;
      session = await dataAccess.createSession();
    });

    it('should not update the provided unchanged Login.', async () => {
      const login = await dataAccess.createLogin(user, client1, session, [], null);

      expect(
        database.prepare('SELECT * FROM logins_clients WHERE login_id = $id').all({ id: toUUIDBuffer(login.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([{ login_id: toUUIDBuffer(login.id), client_id: toUUIDBuffer(client1.id) }]),
      );

      await expect(dataAccess.saveLogin(login)).resolves.not.toThrow();

      expect(
        database.prepare('SELECT * FROM logins_clients WHERE login_id = $id').all({ id: toUUIDBuffer(login.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([{ login_id: toUUIDBuffer(login.id), client_id: toUUIDBuffer(client1.id) }]),
      );
    });

    it('should update the provided Login.', async () => {
      const login = await dataAccess.createLogin(user, client1, session, [], null);

      expect(
        database.prepare('SELECT * FROM logins_clients WHERE login_id = $id').all({ id: toUUIDBuffer(login.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([{ login_id: toUUIDBuffer(login.id), client_id: toUUIDBuffer(client1.id) }]),
      );

      Reflect.set(login, 'clients', [client2]);

      await expect(dataAccess.saveLogin(login)).resolves.not.toThrow();

      expect(
        database.prepare('SELECT * FROM logins_clients WHERE login_id = $id').all({ id: toUUIDBuffer(login.id) }),
      ).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([{ login_id: toUUIDBuffer(login.id), client_id: toUUIDBuffer(client2.id) }]),
      );
    });
  });

  describe('saveSession()', () => {
    beforeEach(async () => {
      await dataAccess.up();
      await dataAccess.seed();
    });

    it('should not update the provided unchanged Session.', async () => {
      let session!: Session;

      const { id } = await dataAccess.createSession();

      await expect(async () => {
        session = (await dataAccess.findSessionById(id))!;
      }).resolves.not.toThrow();

      expect(session.activeLogin).toBeNull();
      expect(session.logins).toBeArrayOfSize(0);
      expect(session.grant).toBeNull();

      await dataAccess.saveSession(session);

      await expect(async () => {
        session = (await dataAccess.findSessionById(id))!;
      }).resolves.not.toThrow();

      expect(session.activeLogin).toBeNull();
      expect(session.logins).toBeArrayOfSize(0);
      expect(session.grant).toBeNull();
    });

    it('should update the provided Session.', async () => {
      let session!: Session;

      const { id } = await dataAccess.createSession();

      await expect(async () => {
        session = (await dataAccess.findSessionById(id))!;
      }).resolves.not.toThrow();

      expect(session.activeLogin).toBeNull();
      expect(session.logins).toBeArrayOfSize(0);
      expect(session.grant).toBeNull();

      const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
      const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
      const login = await dataAccess.createLogin(user, client, session, [], null);

      const parameters: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
      };

      const grant = await dataAccess.createGrant(parameters, client, session);

      session.activeLogin = login;
      session.logins.push(login);
      session.grant = grant;

      await dataAccess.saveSession(session);

      await expect(async () => {
        session = (await dataAccess.findSessionById(id))!;
      }).resolves.not.toThrow();

      expect(session.activeLogin!.id).toBe(login.id);
      expect(session.logins[0]!.id).toBe(login.id);
      expect(session.grant.id).toBe(grant.id);
    });
  });

  describe('up()', () => {
    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'up', name), 'utf8');

    it('should run the migrations of the database.', async () => {
      await expect(dataAccess.up()).resolves.not.toThrow();

      expect(databaseExecSpy).toHaveBeenCalledWith(file('0001-create-table-users.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0002-create-table-user-addresses.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0003-create-table-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0004-create-table-clients.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0005-create-table-client-secrets.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0006-create-table-client-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0007-create-table-access-tokens.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0008-create-table-access-token-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0009-create-table-sessions.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0010-create-table-logins.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0011-create-table-logins-clients.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0012-create-table-consents.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0013-create-table-consent-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0014-create-table-grants.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0015-create-table-authorization-codes.sql'));

      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
          .all()
          .map(({ name }) => name),
      ).toStrictEqual([
        'users',
        'user_addresses',
        'scopes',
        'clients',
        'client_secrets',
        'client_scopes',
        'access_tokens',
        'access_token_scopes',
        'sessions',
        'logins',
        'logins_clients',
        'consents',
        'consent_scopes',
        'grants',
        'authorization_codes',
      ]);
    });
  });

  describe('down()', () => {
    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'migrations', 'down', name), 'utf8');

    it('should revert the migrations of the database.', async () => {
      await dataAccess.up();

      await expect(dataAccess.down()).resolves.not.toThrow();

      expect(databaseExecSpy).toHaveBeenCalledWith(file('0015-drop-table-authorization-codes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0014-drop-table-grants.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0013-drop-table-consent-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0012-drop-table-consents.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0011-drop-table-logins-clients.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0010-drop-table-logins.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0009-drop-table-sessions.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0008-drop-table-access-token-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0007-drop-table-access-tokens.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0006-drop-table-client-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0005-drop-table-client-secrets.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0004-drop-table-clients.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0003-drop-table-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0002-drop-table-user-addresses.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0001-drop-table-users.sql'));

      expect(
        database.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").get()![
          'COUNT(*)'
        ],
      ).toBe(0);
    });
  });

  describe('seed()', () => {
    const file = (name: string) => fs.readFileSync(path.join(__dirname, 'seeds', name), 'utf8');

    it('should seed the database with custom data.', async () => {
      await dataAccess.up();

      await expect(dataAccess.seed()).resolves.not.toThrow();

      expect(databaseExecSpy).toHaveBeenCalledWith(file('0001-seed-users.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0002-seed-scopes.sql'));
      expect(databaseExecSpy).toHaveBeenCalledWith(file('0003-seed-clients.sql'));

      expect(database.prepare('SELECT * FROM users').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            id: Buffer.from('16907c32687b493c85baf41f2c9d4daa', 'hex'),
            password: 'ldMBaaWcQYtSATMV_IG8mf3wp7A6EW80arYoSW80ntU',
            given_name: 'John',
            middle_name: 'Franklin',
            family_name: 'Doe',
            nickname: 'johnny',
            preferred_username: 'j.doe',
            profile: 'https://provider.example.com/users/16907c32-687b-493c-85ba-f41f2c9d4daa',
            picture: 'https://provider.example.com/users/16907c32-687b-493c-85ba-f41f2c9d4daa/picture.jpg',
            website: 'https://johndoe.example.org',
            email: 'john.doe@email.com',
            email_verified: 1,
            gender: 'male',
            birthdate: '1996-03-14',
            zoneinfo: 'America/Sao_Paulo',
            locale: 'pt-BR',
            phone_number: '+55 (11) 98765-4321',
            phone_number_verified: 1,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('5abe9a9cc8684f128c76f34dec7e1cc0', 'hex'),
            password: 'jmfdE1VxQjms3gmLbxz5Br3kW-bbgm3Cysp1NuB66EQ',
            given_name: 'Joe',
            middle_name: null,
            family_name: 'Don',
            nickname: null,
            preferred_username: null,
            profile: null,
            picture: null,
            website: null,
            email: 'joe.don@email.com',
            email_verified: 1,
            gender: null,
            birthdate: '2003-08-05',
            zoneinfo: null,
            locale: null,
            phone_number: '+55 (11) 99999-9999',
            phone_number_verified: 1,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
        ]),
      );

      expect(database.prepare('SELECT * FROM user_addresses').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            id: Buffer.from('59ad24975d174110865629b581af7d01', 'hex'),
            street_address: 'Av. Paulista, 1578 - Bela Vista',
            locality: 'Sao Paulo',
            region: 'SP',
            postal_code: '01310-200',
            country: 'Brazil',
            user_id: Buffer.from('16907c32687b493c85baf41f2c9d4daa', 'hex'),
          },
          {
            id: Buffer.from('6644d819322d4df3a52f134880ced952', 'hex'),
            street_address: null,
            locality: null,
            region: null,
            postal_code: null,
            country: null,
            user_id: Buffer.from('5abe9a9cc8684f128c76f34dec7e1cc0', 'hex'),
          },
        ]),
      );

      expect(database.prepare('SELECT * FROM scopes').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            id: Buffer.from('3c0e3cb6db26406fa082bf591aad8099', 'hex'),
            name: 'openid',
            description: 'Indicates that the Request must return an ID Token.',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('1635b570cddc47fb8d849c37f639ffe5', 'hex'),
            name: 'profile',
            description: 'Returns information about the profile of the User.',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('4c6899e307ae4d3d89d387cd0b65a262', 'hex'),
            name: 'email',
            description: 'Returns information about the email of the User.',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('ba8b75e0bd77449aa45099d70f8278bb', 'hex'),
            name: 'phone',
            description: 'Returns information about the phone of the User.',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('dda525aef8f4436bae08f1e30abe54cf', 'hex'),
            name: 'address',
            description: 'Returns information about the address of the User.',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('ad6794ed66a14f64807468d20f16297e', 'hex'),
            name: 'offline_access',
            description:
              'Allows issuing a Refresh Token that can be used to obtain an Access Token ' +
              "that grants access to the User's Userinfo Endpoint even when not logged in.",
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('be6999c0811b4791b7a835f705862250', 'hex'),
            name: 'foo',
            description: null,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('3a9c4d0af4a94dd4859fcafd3fd229a2', 'hex'),
            name: 'bar',
            description: null,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('1f08abf55f7142a6b8ee83eefe39162b', 'hex'),
            name: 'baz',
            description: null,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('c0d65a3e49834880869d56ec19c61846', 'hex'),
            name: 'qux',
            description: null,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
        ]),
      );

      expect(database.prepare('SELECT * FROM clients').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            name: 'Dev Client #1',
            type: 'public',
            profile: 'web',
            redirect_uris: '["https://client.example.com/oidc/callback"]',
            response_types:
              '["code","code id_token","code id_token token","code token","id_token","id_token token","none","token"]',
            authentication_method: 'client_secret_basic',
            contacts: '[]',
            client_uri: 'https://client.example.com/about',
            logo_uri: 'https://client.example.com/logo.png',
            policy_uri: 'https://client.example.com/policy',
            tos_uri: 'https://client.example.com/terms-of-service',
            jwks_uri: 'https://client.example.com/jwks',
            jwks: null,
            sector_identifier_uri: 'https://client.example.com/sector-identifier',
            subject_type: 'pairwise',
            id_token_signed_response_alg: 'ES256',
            id_token_encrypted_response_alg: 'RSA-OAEP',
            id_token_encrypted_response_enc: 'A128GCM',
            authentication_signing_alg: null,
            default_max_age: 7776000,
            require_auth_time: 1,
            default_acr_values: '["urn:guarani:acr:2fa"]',
            software_id: '6d05a3c4-a2f2-4867-8d2f-f7f6675bd127',
            software_version: '1.0',
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
          {
            id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            name: 'Dev Client #2',
            type: 'confidential',
            profile: 'native',
            redirect_uris: '["https://client.example.org/oidc/callback"]',
            response_types: '["code"]',
            authentication_method: 'none',
            contacts: '[]',
            client_uri: null,
            logo_uri: null,
            policy_uri: null,
            tos_uri: null,
            jwks_uri: null,
            jwks: '{"keys":[{"kty":"EC","crv":"P-256","x":"4c_cS6IT6jaVQeobt_6BDCTmzBaBOTmmiSCpjd5a6Og","y":"mnrPnCFTDkGdEwilabaqM7DzwlAFgetZTmP9ycHPxF8","kid":"ec-key"}]}',
            sector_identifier_uri: null,
            subject_type: 'public',
            id_token_signed_response_alg: null,
            id_token_encrypted_response_alg: null,
            id_token_encrypted_response_enc: null,
            authentication_signing_alg: null,
            default_max_age: null,
            require_auth_time: 0,
            default_acr_values: '["urn:guarani:acr:2fa"]',
            software_id: null,
            software_version: null,
            created_at: expect.toBeNumber(),
            updated_at: expect.toBeNumber(),
          },
        ]),
      );

      expect(database.prepare('SELECT * FROM client_secrets').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            id: Buffer.from('90bf5d4d61814cd2ba36fad3fcf0b19e', 'hex'),
            secret: Buffer.from('cfd2325743ddebffb45d124fe4337e52f15878fe7ab1b357', 'hex'),
            created_at: expect.toBeNumber(),
            expires_at: expect.toBeNumber(),
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
          },
          {
            id: Buffer.from('aa0e4ec5170d4d2ab490497d8699c14b', 'hex'),
            secret: Buffer.from('1075bec739fcf82548cfd0e7376523c486691e8d614cede1', 'hex'),
            created_at: expect.toBeNumber(),
            expires_at: expect.toBeNumber(),
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
          },
        ]),
      );

      expect(database.prepare('SELECT * FROM client_scopes').all()).toStrictEqual<Record<string, SQLOutputValue>[]>(
        expect.arrayContaining([
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('3c0e3cb6db26406fa082bf591aad8099', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('1635b570cddc47fb8d849c37f639ffe5', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('4c6899e307ae4d3d89d387cd0b65a262', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('ba8b75e0bd77449aa45099d70f8278bb', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('dda525aef8f4436bae08f1e30abe54cf', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('ad6794ed66a14f64807468d20f16297e', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('be6999c0811b4791b7a835f705862250', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('3a9c4d0af4a94dd4859fcafd3fd229a2', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('1f08abf55f7142a6b8ee83eefe39162b', 'hex'),
          },
          {
            client_id: Buffer.from('b1eeace92b0c468ea444733befc3b35d', 'hex'),
            scope_id: Buffer.from('c0d65a3e49834880869d56ec19c61846', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('3c0e3cb6db26406fa082bf591aad8099', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('1635b570cddc47fb8d849c37f639ffe5', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('4c6899e307ae4d3d89d387cd0b65a262', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('ba8b75e0bd77449aa45099d70f8278bb', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('dda525aef8f4436bae08f1e30abe54cf', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('ad6794ed66a14f64807468d20f16297e', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('be6999c0811b4791b7a835f705862250', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('3a9c4d0af4a94dd4859fcafd3fd229a2', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('1f08abf55f7142a6b8ee83eefe39162b', 'hex'),
          },
          {
            client_id: Buffer.from('922e0d5e08ba4b0d8068fde37f2c3604', 'hex'),
            scope_id: Buffer.from('c0d65a3e49834880869d56ec19c61846', 'hex'),
          },
        ]),
      );
    });
  });
});

// function toUUIDString(data: Uint8Array): string {
//   return Buffer.from(data)
//     .toString('hex')
//     .replace(/^([\d\w]{8})([\d\w]{4})([\d\w]{4})([\d\w]{4})([\d\w]{12})/i, '$1-$2-$3-$4-$5');
// }

function toUUIDBuffer(data: string): Buffer {
  return Buffer.from(data.replaceAll('-', ''), 'hex');
}
