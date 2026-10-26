import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { SubjectTypeName } from '../subject-type-name.type';
import { PublicSubjectType } from './public.subject-type';

jest.mock('../../loggers/logger');

describe('Public Subject Type', () => {
  let subjectType: PublicSubjectType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });
  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(PublicSubjectType).toSelf().asSingleton();

    subjectType = container.resolve(PublicSubjectType);
  });

  describe('name', () => {
    it('should have "public" as its value.', () => {
      expect(subjectType.name).toBe<SubjectTypeName>('public');
    });
  });

  describe('calculateSubjectIdentifier()', () => {
    it('should return the User Identifier as the Subject Identifier.', () => {
      expect(subjectType.calculateSubjectIdentifier(user, client)).toBe(user.id);
    });
  });

  describe('retrieveSubjectIdentifier()', () => {
    it('should return the provided Subject Identifier as the Local Subject Identifier.', () => {
      expect(subjectType.retrieveSubjectIdentifier('user_id', client)).toBe(user.id);
    });
  });
});
