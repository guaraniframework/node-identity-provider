import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { LoginRequiredError } from './login-required.error';

describe('Login Required Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Login Required Error.', () => {
      let error!: LoginRequiredError;

      expect(() => (error = new LoginRequiredError('Login Required Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.LoginRequired);
      expect(error.description).toBe('Login Required Error.');
      expect(error.status).toBe(HttpResponseStatus.Unauthorized);
    });
  });
});
