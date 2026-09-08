import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { UnsupportedMediaTypeError } from './unsupported-media-type.error';

jest.mock('../../logger/logger');

describe('Unsupported Media Type Error', () => {
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
    test('should instantiate a new Unsupported Media Type Error.', () => {
      const error = new UnsupportedMediaTypeError('Unsupported Media Type.');

      expect(error.error).toEqual<ErrorCode>('unsupported_media_type');
      expect(error.status).toEqual(415);
    });
  });
});
