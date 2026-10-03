import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { InvalidClientError } from './invalid-client.error';

jest.mock('../../logger/logger');

describe('Invalid Client Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Invalid Client Error.', () => {
      const error = new InvalidClientError('Invalid Client.');

      expect(error.error).toEqual<ErrorCode>('invalid_client');
      expect(error.status).toEqual(401);
    });
  });
});
