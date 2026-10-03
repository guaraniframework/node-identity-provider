import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { ConsentRequiredError } from './consent-required.error';

jest.mock('../../logger/logger');

describe('Consent Required Error', () => {
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
    test('should instantiate a new Consent Required Error.', () => {
      const error = new ConsentRequiredError('Consent Required.');

      expect(error.error).toEqual<ErrorCode>('consent_required');
      expect(error.status).toEqual(403);
    });
  });
});
