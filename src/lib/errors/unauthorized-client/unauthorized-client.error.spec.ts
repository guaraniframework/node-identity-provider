import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnauthorizedClientError } from './unauthorized-client.error';

describe('Unauthorized Client Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unauthorized Client Error.', () => {
      let error!: UnauthorizedClientError;

      expect(() => (error = new UnauthorizedClientError('Unauthorized Client Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnauthorizedClient);
      expect(error.description).toBe('Unauthorized Client Error.');
      expect(error.status).toBe(HttpResponseStatus.Forbidden);
    });
  });
});
