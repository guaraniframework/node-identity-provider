import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { InteractionRequiredError } from './interaction-required.error';

jest.mock('../../logger/logger');

describe('Interaction Required Error', () => {
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
    test('should instantiate a new Interaction Required Error.', () => {
      const error = new InteractionRequiredError('Interaction Required.');

      expect(error.error).toEqual<ErrorCode>('interaction_required');
      expect(error.status).toEqual(401);
    });
  });
});
