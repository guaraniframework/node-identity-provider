import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { InvalidClientError } from './invalid-client.error';

describe('Invalid Client Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Invalid Client Error.', () => {
      let error!: InvalidClientError;

      expect(() => (error = new InvalidClientError('Invalid Client Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.InvalidClient);
      expect(error.description).toBe('Invalid Client Error.');
      expect(error.status).toBe(HttpResponseStatus.Unauthorized);
    });
  });
});
