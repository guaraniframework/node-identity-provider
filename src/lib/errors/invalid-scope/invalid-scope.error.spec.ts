import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { InvalidScopeError } from './invalid-scope.error';

describe('Invalid Scope Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Invalid Scope Error.', () => {
      let error!: InvalidScopeError;

      expect(() => (error = new InvalidScopeError('Invalid Scope Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.InvalidScope);
      expect(error.description).toBe('Invalid Scope Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
