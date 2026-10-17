import { getContainer } from '@guarani/di';

import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
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
    it('should instantiate a new Method Not Allowed Error.', () => {
      let error!: MethodNotAllowedError;

      expect(() => (error = new MethodNotAllowedError('Method Not Allowed Error.'))).not.toThrow();

      expect(error.error).toEqual(ErrorCode.MethodNotAllowed);
      expect(error.description).toEqual('Method Not Allowed Error.');
      expect(error.status).toEqual(HttpResponseStatus.MethodNotAllowed);
    });
  });
});
