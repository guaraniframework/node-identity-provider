import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { InteractionRequiredError } from './interaction-required.error';

describe('Interaction Required Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Interaction Required Error.', () => {
      let error!: InteractionRequiredError;

      expect(() => (error = new InteractionRequiredError('Interaction Required Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.InteractionRequired);
      expect(error.description).toBe('Interaction Required Error.');
      expect(error.status).toBe(HttpResponseStatus.Unauthorized);
    });
  });
});
