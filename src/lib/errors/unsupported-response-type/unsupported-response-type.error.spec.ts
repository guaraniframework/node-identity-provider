import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnsupportedResponseTypeError } from './unsupported-response-type.error';

describe('Unsupported Response Type Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unsupported Response Type Error.', () => {
      let error!: UnsupportedResponseTypeError;

      expect(() => (error = new UnsupportedResponseTypeError('Unsupported Response Type Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnsupportedResponseType);
      expect(error.description).toBe('Unsupported Response Type Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
