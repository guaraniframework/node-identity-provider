import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { UnmetAuthenticationRequirementsError } from './unmet-authentication-requirements.error';

jest.mock('../../logger/logger');

describe('Unmet Authentication Requirements Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Unmet Authentication Requirements Error.', () => {
      const error = new UnmetAuthenticationRequirementsError('Unmet Authentication Requirements.');

      expect(error.error).toEqual<ErrorCode>('unmet_authentication_requirements');
      expect(error.status).toEqual(400);
    });
  });
});
