import { DatabaseSync } from 'node:sqlite';

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
}
