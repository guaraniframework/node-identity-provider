import { DatabaseSync } from 'node:sqlite';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
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
});
