import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnsupportedTokenTypeError } from './unsupported-token-type.error';

describe('Unsupported Token Type Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unsupported Token Type Error.', () => {
      let error!: UnsupportedTokenTypeError;

      expect(() => (error = new UnsupportedTokenTypeError('Unsupported Token Type Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnsupportedTokenType);
      expect(error.description).toBe('Unsupported Token Type Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
