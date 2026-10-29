import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { UnsupportedInteractionTypeError } from './unsupported-interaction-type.error';

describe('Unsupported Interaction Type Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Unsupported Interaction Type Error.', () => {
      let error!: UnsupportedInteractionTypeError;

      expect(() => (error = new UnsupportedInteractionTypeError('Unsupported Interaction Type Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.UnsupportedInteractionType);
      expect(error.description).toBe('Unsupported Interaction Type Error.');
      expect(error.status).toBe(HttpResponseStatus.BadRequest);
    });
  });
});
