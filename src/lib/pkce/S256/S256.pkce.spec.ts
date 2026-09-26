import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { PkceName } from '../pkce-name.type';
import { S256Pkce } from './S256.pkce';

jest.mock('../../logger/logger');

describe('S256 PKCE', () => {
  let pkce: S256Pkce;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(S256Pkce).toSelf().asSingleton();

    pkce = container.resolve(S256Pkce);
  });

  describe('name', () => {
    it('should have "S256" as its value.', () => {
      expect(pkce.name).toEqual<PkceName>('S256');
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
