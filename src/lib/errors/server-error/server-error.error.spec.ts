import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { ServerErrorError } from './server-error.error';

describe('Server Error Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Server Error Error.', () => {
      let error!: ServerErrorError;

      expect(() => (error = new ServerErrorError('Server Error Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.ServerError);
      expect(error.description).toBe('Server Error Error.');
      expect(error.status).toBe(HttpResponseStatus.InternalServerError);
    });
  });
});
