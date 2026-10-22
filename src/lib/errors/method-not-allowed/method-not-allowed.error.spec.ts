import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { MethodNotAllowedError } from './method-not-allowed.error';

describe('Method Not Allowed Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Method Not Allowed Error.', () => {
      let error!: MethodNotAllowedError;

      expect(() => (error = new MethodNotAllowedError('Method Not Allowed Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.MethodNotAllowed);
      expect(error.description).toBe('Method Not Allowed Error.');
      expect(error.status).toBe(HttpResponseStatus.MethodNotAllowed);
    });
  });
});
