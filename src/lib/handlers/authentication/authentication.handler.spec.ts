import { getContainer } from '@guarani/di';

import { DataAccess } from '../../data-access/data-access';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthenticationHandler } from './authentication.handler';

jest.mock('../../logger/logger');

describe('Authentication Handler', () => {
  let handler: AuthenticationHandler;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      logout: jest.fn(),
      inactivateSessionActiveLogin: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(AuthenticationHandler).toSelf().asSingleton();

    handler = container.resolve(AuthenticationHandler);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('logout()', () => {
    let login1: Login;
    let login2: Login;
    let session: Session;

    beforeEach(() => {
      login1 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id_1' });
      login2 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id_2' });

      session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login1,
        logins: [login1, login2],
      });
    });

    it('should invalidate the Active Login from the Session.', async () => {
      await handler.logout(login1, session);

      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(
        login1,
        expect.objectContaining<Partial<Session>>({ id: 'session_id', activeLogin: null, logins: [login2] }),
      );

      expect(loggerMock.debug).toHaveBeenNthCalledWith(
        2,
        '[AuthenticationHandler] Invalidating Active Login',
        'a29d75e3-606e-4643-b5d3-26f4a0314e64',
        { login: login1, session },
      );
    });

    it('should invalidate a Login that is not the Active Login from the Session.', async () => {
      await handler.logout(login2, session);

      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(
        login2,
        expect.objectContaining<Partial<Session>>({ id: 'session_id', activeLogin: login1, logins: [login1] }),
      );
    });
  });

  describe('inactivateSessionActiveLogin()', () => {
    let login1: Login;
    let login2: Login;
    let session: Session;

    beforeEach(() => {
      login1 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id_1' });
      login2 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id_2' });

      session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login1,
        logins: [login1, login2],
      });
    });

    it('should remove the Active Login from the Session.', async () => {
      await handler.inactivateSessionActiveLogin(session);

      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Partial<Session>>({ ...session, activeLogin: null }),
      );
    });
  });
});
