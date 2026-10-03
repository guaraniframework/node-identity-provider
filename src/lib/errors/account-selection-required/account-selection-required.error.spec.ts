import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { AccountSelectionRequiredError } from './account-selection-required.error';

jest.mock('../../logger/logger');

describe('Account Selection Required Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    test('should instantiate a new Account Selection Required Error.', () => {
      const error = new AccountSelectionRequiredError('Account Selection Required.');

      expect(error.error).toEqual<ErrorCode>('account_selection_required');
      expect(error.status).toEqual(403);
    });
  });
});
