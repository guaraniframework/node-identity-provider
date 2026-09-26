import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { UnsupportedResponseTypeError } from './unsupported-response-type.error';

jest.mock('../../logger/logger');

describe('Unsupported Response Type Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Unsupported Response Type Error.', () => {
      const error = new UnsupportedResponseTypeError('Unsupported Response Type.');

      expect(error.error).toEqual<ErrorCode>('unsupported_response_type');
      expect(error.status).toEqual(400);
    });
  });
});
