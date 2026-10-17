import { getContainer } from '@guarani/di';

import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
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
    it('should instantiate a new Server Error Error.', () => {
      let error!: ServerErrorError;

      expect(() => (error = new ServerErrorError('Server Error Error.'))).not.toThrow();

      expect(error.error).toEqual(ErrorCode.ServerError);
      expect(error.description).toEqual('Server Error Error.');
      expect(error.status).toEqual(HttpResponseStatus.InternalServerError);
    });
  });
});
