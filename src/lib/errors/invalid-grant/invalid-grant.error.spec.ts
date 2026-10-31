import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { InvalidGrantError } from './invalid-grant.error';

describe('Invalid Grant Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Invalid Grant Error.', () => {
      let error!: InvalidGrantError;

      expect(() => (error = new InvalidGrantError('Invalid Grant Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.InvalidGrant);
      expect(error.description).toBe('Invalid Grant Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
