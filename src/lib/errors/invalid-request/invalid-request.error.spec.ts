import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { InvalidRequestError } from './invalid-request.error';

describe('Invalid Request Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Invalid Request Error.', () => {
      let error!: InvalidRequestError;

      expect(() => (error = new InvalidRequestError('Invalid Request Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.InvalidRequest);
      expect(error.description).toBe('Invalid Request Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
