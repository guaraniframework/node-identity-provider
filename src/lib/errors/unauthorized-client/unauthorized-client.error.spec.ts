import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { UnauthorizedClientError } from './unauthorized-client.error';

jest.mock('../../logger/logger');

describe('Unauthorized Client Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Unauthorized Client Error.', () => {
      const error = new UnauthorizedClientError('Unauthorized Client.');

      expect(error.error).toEqual<ErrorCode>('unauthorized_client');
      expect(error.status).toEqual(400);
    });
  });
});
