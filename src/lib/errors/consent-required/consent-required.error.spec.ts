import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { ConsentRequiredError } from './consent-required.error';

describe('Consent Required Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Consent Required Error.', () => {
      let error!: ConsentRequiredError;

      expect(() => (error = new ConsentRequiredError('Consent Required Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.ConsentRequired);
      expect(error.description).toBe('Consent Required Error.');
      expect(error.status).toBe(HttpResponseStatus.Forbidden);
    });
  });
});
