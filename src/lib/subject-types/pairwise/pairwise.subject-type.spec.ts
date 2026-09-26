import { getContainer } from '@guarani/di';

import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { SubjectTypeName } from '../subject-type-name.type';
import { PairwiseSubjectType } from './pairwise.subject-type';

jest.mock('../../logger/logger');

describe('Pairwise Subject Type', () => {
  let subjectType: PairwiseSubjectType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const settings: Partial<Settings> = { secretKey: '0123456789abcdef' };

  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    sectorIdentifierUri: new URL('https://client.example.com/redirect_uris.json'),
    pairwiseSalt: 'f2ad0faed5a636483adc4b5c268b72e3',
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(PairwiseSubjectType).toSelf().asSingleton();

    subjectType = container.resolve(PairwiseSubjectType);
  });

  describe('name', () => {
    it('should have "public" as its value.', () => {
      expect(subjectType.name).toEqual<SubjectTypeName>('pairwise');
    });
  });

  describe('calculateSubjectIdentifier()', () => {
    it('should return the aes-128-cbc encrypted digest of the User Identifier as the Subject Identifier.', () => {
      expect(subjectType.calculateSubjectIdentifier(user, client)).toEqual(
        'RJnbyZmX5RN85M5QV9glUsR8tDsSdYGmdrCeDqQ3iuk',
      );
    });
  });

  it('should return the aes-128-cbc decrypted digest of the provided Subject Identifier as the Local Subject Identifier.', () => {
    expect(subjectType.retrieveSubjectIdentifier('RJnbyZmX5RN85M5QV9glUsR8tDsSdYGmdrCeDqQ3iuk', client)).toEqual(
      user.id,
    );
  });
});
