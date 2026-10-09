import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorCode } from '../error-code.enum';
import { ServerErrorError } from './server-error.error';

jest.mock('../../logger/logger');

describe('Server Error Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Server Error Error.', () => {
      const error = new ServerErrorError('Server Error.');

      expect(error.error).toEqual(ErrorCode.ServerError);
      expect(error.status).toEqual(500);
    });
  });
});
