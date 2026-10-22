import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { NotFoundError } from './not-found.error';

describe('Not Found Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Not Found Error.', () => {
      let error!: NotFoundError;

      expect(() => (error = new NotFoundError('Not Found Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.NotFound);
      expect(error.description).toBe('Not Found Error.');
      expect(error.status).toBe(HttpResponseStatus.NotFound);
    });
  });
});
