import { getContainer } from '@guarani/di';

import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
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
  });

  describe('constructor', () => {
    it('should instantiate a new Invalid Request Error.', () => {
      let error!: InvalidRequestError;

      expect(() => (error = new InvalidRequestError('Invalid Request Error.'))).not.toThrow();

      expect(error.error).toEqual(ErrorCode.InvalidRequest);
      expect(error.description).toEqual('Invalid Request Error.');
      expect(error.status).toEqual(HttpResponseStatus.BadRequest);
    });
  });
});
