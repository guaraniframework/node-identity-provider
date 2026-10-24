import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { AccessDeniedError } from './access-denied.error';

describe('Access Denied Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Access Denied Error.', () => {
      let error!: AccessDeniedError;

      expect(() => (error = new AccessDeniedError('Access Denied Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.AccessDenied);
      expect(error.description).toBe('Access Denied Error.');
      expect(error.status).toBe(HttpResponseStatus.Forbidden);
    });
  });
});
