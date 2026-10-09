import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorCode } from '../error-code.enum';
import { InvalidRequestError } from './invalid-request.error';

jest.mock('../../logger/logger');

describe('Invalid Request Error', () => {
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
    test('should instantiate a new Invalid Request Error.', () => {
      const error = new InvalidRequestError('Invalid Request.');

      expect(error.error).toEqual(ErrorCode.InvalidRequest);
      expect(error.status).toEqual(400);
    });
  });
});
