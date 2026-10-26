import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { Logger } from '../../loggers/logger';
import { PKCEName } from '../pkce-name.type';
import { S256PKCE } from './S256.pkce';

jest.mock('../../loggers/logger');

describe('S256 PKCE', () => {
  let pkce: S256PKCE;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(S256PKCE).toSelf().asSingleton();

    pkce = container.resolve(S256PKCE);
  });

  describe('name', () => {
    it('should have "S256" as its value.', () => {
      expect(pkce.name).toBe<PKCEName>('S256');
    });
  });

  describe('verify()', () => {
    it('should return false when comparing a Challenge to a different Verifier.', () => {
      expect(pkce.verify('8xJ5XjIsh0YabzxJ4JiXxZyg1aNiRdKgDwjLxm7ul20', 'abc123')).toBeFalse();
    });

    it('should return true when comparing a Challenge to its Verifier.', () => {
      expect(pkce.verify('8xJ5XjIsh0YabzxJ4JiXxZyg1aNiRdKgDwjLxm7ul20', 'abcxyz')).toBeTrue();
    });
  });
});
