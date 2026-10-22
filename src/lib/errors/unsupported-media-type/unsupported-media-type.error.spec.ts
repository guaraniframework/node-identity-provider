import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnsupportedMediaTypeError } from './unsupported-media-type.error';

describe('Unsupported Media Type Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unsupported Media Type Error.', () => {
      let error!: UnsupportedMediaTypeError;

      expect(() => (error = new UnsupportedMediaTypeError('Unsupported Media Type Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnsupportedMediaType);
      expect(error.description).toBe('Unsupported Media Type Error.');
      expect(error.status).toBe(HttpResponseStatus.UnsupportedMediaType);
    });
  });
});
