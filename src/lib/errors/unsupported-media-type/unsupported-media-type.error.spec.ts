import { getContainer } from '@guarani/di';

import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorCode } from '../error-code.enum';
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
  });

  describe('constructor', () => {
    it('should instantiate a new Unsupported Media Type Error.', () => {
      let error!: UnsupportedMediaTypeError;

      expect(() => (error = new UnsupportedMediaTypeError('Unsupported Media Type Error.'))).not.toThrow();

      expect(error.error).toEqual(ErrorCode.UnsupportedMediaType);
      expect(error.description).toEqual('Unsupported Media Type Error.');
      expect(error.status).toEqual(HttpResponseStatus.UnsupportedMediaType);
    });
  });
});
