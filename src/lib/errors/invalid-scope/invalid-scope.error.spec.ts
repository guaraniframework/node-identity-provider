import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { InvalidScopeError } from './invalid-scope.error';

jest.mock('../../logger/logger');

describe('Invalid Scope Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Invalid Scope Error.', () => {
      const error = new InvalidScopeError('Invalid Scope.');

      expect(error.error).toEqual<ErrorCode>('invalid_scope');
      expect(error.status).toEqual(400);
    });
  });
});
