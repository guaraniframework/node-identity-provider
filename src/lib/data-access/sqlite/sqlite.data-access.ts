import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import { Injectable } from '@guarani/di';

import { Logger } from '../../loggers/logger';
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
   */
  public constructor(
    private readonly logger: Logger,
    private readonly database: DatabaseSync,
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
}
