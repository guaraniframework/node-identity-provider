import { Buffer } from 'buffer';
import { randomUUIDv7 } from 'crypto';
import fs from 'fs';
import { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import path from 'path';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { Logger } from '../../loggers/logger';
import { SQLiteDataAccess } from './sqlite.data-access';

jest.mock('../../loggers/logger');

describe('SQLite Data Access', () => {
  let dataAccess: SQLiteDataAccess;
  const container = getContainer(CONTAINER);

  let databaseExecSpy: jest.SpyInstance;

  let database: DatabaseSync;
  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    database = new DatabaseSync(':memory:');

    databaseExecSpy = jest.spyOn(database, 'exec');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DatabaseSync).toValue(database);
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
      const loginId = randomUUIDv7();
      const consentId = randomUUIDv7();
      const grantId = randomUUIDv7();
      const userId = '16907c32-687b-493c-85ba-f41f2c9d4daa';
      const clientId = 'b1eeace9-2b0c-468e-a444-733befc3b35d';

      const insertSessionSql = 'INSERT INTO sessions (id, active_login_id, grant_id) VALUES ($id, NULL, NULL)';

      const insertLoginSql = 'INSERT INTO logins (id, user_id, session_id) VALUES ($id, $user_id, $session_id)';
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

      database
        .prepare(insertLoginSql)
        .run({ id: toUUIDBuffer(loginId), user_id: toUUIDBuffer(userId), session_id: toUUIDBuffer(sessionId) });

      database
        .prepare(insertLoginsClientsSql)
        .run({ login_id: toUUIDBuffer(loginId), client_id: toUUIDBuffer(clientId) });

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
        .run({ active_login_id: toUUIDBuffer(loginId), grant_id: toUUIDBuffer(grantId), id: toUUIDBuffer(sessionId) });

      await expect(async () => (session = (await dataAccess.findSessionById(sessionId))!)).resolves.not.toThrow();

      expect(session).toBeInstanceOf(Session);

      expect(session.activeLogin!.id).toBe(loginId);
      expect(session.activeLogin!.session).toBe(session);
      expect(session.activeLogin!.user.id).toBe(userId);
      expect(session.activeLogin!.clients[0]!.id).toBe(clientId);
      expect(session.logins[0]!.id).toBe(loginId);
      expect(session.grant!.id).toBe(grantId);
      expect(session.grant!.client.id).toBe(clientId);
      expect(session.grant!.session.id).toBe(sessionId);
      expect(session.grant!.consent!.id).toBe(consentId);
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
            middle_name: null,
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
        ]),
      );

      expect(
        database
          .prepare('SELECT * FROM user_addresses WHERE user_id = $user_id')
          .all({ user_id: toUUIDBuffer('16907c32-687b-493c-85ba-f41f2c9d4daa') }),
      ).toStrictEqual<Record<string, SQLOutputValue>[]>(
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
