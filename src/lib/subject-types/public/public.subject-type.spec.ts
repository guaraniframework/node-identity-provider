import { getContainer } from '@guarani/di';

import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { SubjectTypeName } from '../subject-type-name.type';
import { PublicSubjectType } from './public.subject-type';

jest.mock('../../logger/logger');

describe('Public Subject Type', () => {
  let subjectType: PublicSubjectType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });
  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(PublicSubjectType).toSelf().asSingleton();

    subjectType = container.resolve(PublicSubjectType);
  });

  describe('name', () => {
    it('should have "public" as its value.', () => {
      expect(subjectType.name).toEqual<SubjectTypeName>('public');
    });
  });

  describe('calculateSubjectIdentifier()', () => {
    it('should return the User Identifier as the Subject Identifier.', () => {
      expect(subjectType.calculateSubjectIdentifier(user, client)).toEqual(user.id);
    });
  });

  describe('retrieveSubjectIdentifier()', () => {
    it('should return the provided Subject Identifier as the Local Subject Identifier.', () => {
      expect(subjectType.retrieveSubjectIdentifier('user_id', client)).toEqual(user.id);
    });
  });
});
