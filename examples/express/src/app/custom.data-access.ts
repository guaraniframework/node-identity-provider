import fs from 'fs';
import path from 'path';

import { Injectable } from '@guarani/di';
import { JsonWebKey } from '@guarani/jose';

import { SQLiteDataAccess } from '../../../../src/lib/data-access/sqlite/sqlite.data-access';
import { Client } from '../../../../src/lib/entities/client';
import { Login } from '../../../../src/lib/entities/login';
import { User } from '../../../../src/lib/entities/user';

@Injectable()
export class CustomDataAccess extends SQLiteDataAccess {
  public async findClients(): Promise<Client[]> {
    this.logger.debug(`[${this.constructor.name}] Called findClients()`, 'b701af45-a92b-4d38-8933-27b659d0de2b', null);

    const clientsSql = 'SELECT * FROM clients';
    const clientsParameters = this.database.prepare(clientsSql).all();

    const clients = clientsParameters.map((clientParameters) =>
      this._instantiateClient(
        clientParameters,
        this._findClientSecretsByClientId(this._toUUIDString(clientParameters['id'] as Uint8Array)),
        this._findClientScopesByClientId(this._toUUIDString(clientParameters['id'] as Uint8Array)),
      ),
    );

    this.logger.debug(`[${this.constructor.name}] Completed findClients()`, 'e63e76c2-8b17-4670-a577-4aad8bc2c22b', {
      clients_ids: clients.map((client) => client.id),
    });

    return clients;
  }

  public override async findJsonWebKeyByKeyId(id: string): Promise<JsonWebKey | null> {
    return this.jsonWebKeySet.find((jsonWebKey) => jsonWebKey.kid === id);
  }

  public async findLoginsByIds(ids: string[]): Promise<Login[]> {
    this.logger.debug(`[${this.constructor.name}] Called findLoginsByIds()`, '3ad882d1-05fa-40ba-ab0d-784d1bb065bc', {
      logins_ids: ids,
    });

    const loginsSql = `SELECT * FROM logins WHERE id IN (${ids.map(() => '?').join(', ')})`;
    const loginsParameters = this.database.prepare(loginsSql).all(...ids);

    const logins = loginsParameters.map((loginParameters) => {
      const user = this._findUserById(this._toUUIDString(loginParameters['user_id'] as Uint8Array))!;
      const session = this._findSessionById(
        this._toUUIDString(loginParameters['session_id'] as Uint8Array),
        null,
        null,
      )!;

      const clients = this._findLoginClientsByLoginId(this._toUUIDString(loginParameters['id'] as Uint8Array));

      return this._instantiateLogin(loginParameters, user, session, clients);
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed findLoginsByIds()`,
      '6915a5cf-bc08-47bf-9d99-447a9fbdf944',
      { logins_ids: ids },
    );

    return logins;
  }

  public override async getClientAssertionSignJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '03bf969a-e23b-42f7-8955-199e52faa09f');
  }

  public override async getClientAssertionUnwrapJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '72876294-6f85-43f6-bb3d-e80e9dca9553');
  }

  public override async getJwtBearerGrantUnwrapJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '72876294-6f85-43f6-bb3d-e80e9dca9553');
  }

  public override async getSignJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '03bf969a-e23b-42f7-8955-199e52faa09f');
  }

  public override async getUnwrapJsonWebKey(): Promise<JsonWebKey> {
    return this.jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '72876294-6f85-43f6-bb3d-e80e9dca9553');
  }

  public async saveUser(user: User): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called saveUser()`, '7c3c399c-862b-46a9-b90d-8e04a588bc67', {
      user_id: user.id,
    });

    const savedUser = (await this.findUserById(user.id))!;

    const userSql = `
      UPDATE users SET
        given_name = $given_name,
        middle_name = $middle_name,
        family_name = $family_name,
        nickname = $nickname,
        preferred_username = $preferred_username,
        profile = $profile,
        picture = $picture,
        website = $website,
        email = $email,
        email_verified = $email_verified,
        gender = $gender,
        birthdate = $birthdate,
        zoneinfo = $zoneinfo,
        locale = $locale,
        phone_number = $phone_number,
        phone_number_verified = $phone_number_verified
      WHERE id = $id;
    `;

    this.database.prepare(userSql).run({
      given_name: user.givenName,
      middle_name: user.middleName,
      family_name: user.familyName,
      nickname: user.nickname,
      preferred_username: user.preferredUsername,
      profile: user.profile?.href ?? null,
      picture: user.picture?.href ?? null,
      website: user.website?.href ?? null,
      email: user.email,
      email_verified: savedUser.email === user.email ? 1 : 0,
      gender: user.gender,
      birthdate: user.birthdate,
      zoneinfo: user.zoneinfo,
      locale: user.locale,
      phone_number: user.phoneNumber,
      phone_number_verified: savedUser.phoneNumber === user.phoneNumber ? 1 : 0,
      id: this._toUUIDBuffer(user.id),
    });

    this.logger.debug(`[${this.constructor.name}] Completed saveUser()`, 'c63d0834-05ab-439b-8778-811521908b59', {
      user_id: user.id,
    });
  }

  public override async seed(): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called seed()`, '77b82eca-d555-4045-bb3c-5a5453a0db01', null);

    const file = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'db', 'seeders', name), 'utf8');

    await this.atomic(async () => {
      this.database.exec(file('0001-seed-users.sql'));
      this.database.exec(file('0002-seed-scopes.sql'));
      this.database.exec(file('0003-seed-clients.sql'));
    });

    this.logger.debug(`[${this.constructor.name}] Completed seed()`, 'cff15384-2995-415d-8420-67458827f99a', null);
  }
}
