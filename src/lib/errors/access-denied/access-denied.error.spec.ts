import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { AccessDeniedError } from './access-denied.error';

jest.mock('../../logger/logger');

describe('Access Denied Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Access Denied Error.', () => {
      const error = new AccessDeniedError('Access Denied.');

      expect(error.error).toEqual<ErrorCode>('access_denied');
      expect(error.status).toEqual(400);
    });
  });
});
