import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorCode } from '../error-code.enum';
import { MethodNotAllowedError } from './method-not-allowed.error';

jest.mock('../../logger/logger');

describe('Method Not Allowed Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Method Not Allowed Error.', () => {
      const error = new MethodNotAllowedError('Method Not Allowed.');

      expect(error.error).toEqual(ErrorCode.MethodNotAllowed);
      expect(error.status).toEqual(405);
    });
  });
});
