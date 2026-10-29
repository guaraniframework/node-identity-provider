import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { Logger } from '../../loggers/logger';
import { PKCEName } from '../pkce-name.type';
import { PlainPKCE } from './plain.pkce';

jest.mock('../../loggers/logger');

describe('Plain PKCE', () => {
  let pkce: PlainPKCE;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(PlainPKCE).toSelf().asSingleton();

    pkce = container.resolve(PlainPKCE);
  });

  describe('name', () => {
    it('should have "plain" as its value.', () => {
      expect(pkce.name).toBe<PKCEName>('plain');
    });
  });

  describe('verify()', () => {
    it('should return false when comparing two different strings.', () => {
      expect(pkce.verify('abcxyz', 'abc123')).toBeFalse();
    });

    it('should return true when comparing the same strings.', () => {
      expect(pkce.verify('abcxyz', 'abcxyz')).toBeTrue();
    });
  });
});
