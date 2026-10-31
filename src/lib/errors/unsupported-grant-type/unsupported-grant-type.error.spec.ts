import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnsupportedGrantTypeError } from './unsupported-grant-type.error';

describe('Unsupported Grant Type Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unsupported Grant Type Error.', () => {
      let error!: UnsupportedGrantTypeError;

      expect(() => (error = new UnsupportedGrantTypeError('Unsupported Grant Type Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnsupportedGrantType);
      expect(error.description).toBe('Unsupported Grant Type Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
