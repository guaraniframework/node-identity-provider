import { getContainer } from '@guarani/di';

import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorCode } from '../error-code.enum';
import { NotFoundError } from './not-found.error';

jest.mock('../../logger/logger');

describe('Not Found Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    it('should instantiate a new Not Found Error.', () => {
      let error!: NotFoundError;

      expect(() => (error = new NotFoundError('Not Found Error.'))).not.toThrow();

      expect(error.error).toEqual(ErrorCode.NotFound);
      expect(error.description).toEqual('Not Found Error.');
      expect(error.status).toEqual(HttpResponseStatus.NotFound);
    });
  });
});
