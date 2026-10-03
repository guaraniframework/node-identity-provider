import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ErrorCode } from '../error-code.type';
import { UnsupportedInteractionTypeError } from './unsupported-interaction-type.error';

jest.mock('../../logger/logger');

describe('Unsupported Interaction Type Error', () => {
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
  });

  afterEach(() => {
    container.clear();
  });

  describe('constructor', () => {
    test('should instantiate a new Unsupported Interaction Type Error.', () => {
      const error = new UnsupportedInteractionTypeError('Unsupported Interaction Type.');

      expect(error.error).toEqual<ErrorCode>('unsupported_interaction_type');
      expect(error.status).toEqual(400);
    });
  });
});
