import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnmetAuthenticationRequirementsError } from './unmet-authentication-requirements.error';

describe('Unmet Authentication Requirements Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unmet Authentication Requirements Error.', () => {
      let error!: UnmetAuthenticationRequirementsError;

      expect(() => {
        error = new UnmetAuthenticationRequirementsError('Unmet Authentication Requirements Error.');
      }).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnmetAuthenticationRequirements);
      expect(error.description).toBe('Unmet Authentication Requirements Error.');
      expect(error.status).toBe(HttpResponseStatus.Unauthorized);
    });
  });
});
