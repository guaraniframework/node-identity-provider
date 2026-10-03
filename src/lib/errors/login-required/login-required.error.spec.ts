import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { LoginRequiredError } from './login-required.error';

jest.mock('../../logger/logger');

describe('Login Required Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    test('should instantiate a new Login Required Error.', () => {
      const error = new LoginRequiredError('Login Required.');

      expect(error.error).toEqual<ErrorCode>('login_required');
      expect(error.status).toEqual(401);
    });
  });
});
