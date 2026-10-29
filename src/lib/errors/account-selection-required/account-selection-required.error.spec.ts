import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { ErrorCode } from '../error-code.enum';
import { AccountSelectionRequiredError } from './account-selection-required.error';

describe('Account Selection Required Error', () => {
  describe('constructor', () => {
    it('should instantiate a new Account Selection Required Error.', () => {
      let error!: AccountSelectionRequiredError;

      expect(() => (error = new AccountSelectionRequiredError('Account Selection Required Error.'))).not.toThrow();

      expect(error.error).toBe(ErrorCode.AccountSelectionRequired);
      expect(error.description).toBe('Account Selection Required Error.');
      expect(error.status).toBe(HttpResponseStatus.Unauthorized);
    });
  });
});
