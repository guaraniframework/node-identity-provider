import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { SelectAccountContextInteractionContext } from '../../context/interaction/context/select-account/select-account-context.interaction-context';
import { SelectAccountDecisionInteractionContext } from '../../context/interaction/decision/select-account/select-account-decision.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { SelectAccountContextInteractionResponse } from '../../responses/interaction/context/select-account/select-account-context.interaction-response';
import { SelectAccountDecisionInteractionResponse } from '../../responses/interaction/decision/select-account/select-account-decision.interaction-response';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { SelectAccountInteractionType } from './select-account.interaction-type';

jest.mock('../../logger/logger');

describe('Select Account Interaction Type', () => {
  let interactionType: SelectAccountInteractionType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      removeGrant: jest.fn(),
      saveGrant: jest.fn(),
      saveSession: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = { issuer: new URL('https://idp.example.com') };

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(SelectAccountInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(SelectAccountInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "select_account" as its value.', () => {
      expect(interactionType.name).toEqual<InteractionTypeName>('select_account');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;

    const login0: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login0_id' });
    const login1: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login1_id' });
    const login2: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login2_id' });

    const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
      id: 'session_id',
      logins: [login0, login1, login2],
    });

    beforeEach(() => {
      grantParameters = { display: 'page', prompt: 'select_account', ui_locales: 'en' } as AuthorizationRequest;
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 3600000),
      });

      const context = { grant } as SelectAccountContextInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountInteractionType] Expired Grant',
        '9e2854de-27fc-4136-bd6c-c64bdba3d72a',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a non-skip Select Account Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        session,
      });

      const context = { grant } as SelectAccountContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(
        interactionType.handleContext(context),
      ).resolves.toStrictEqual<SelectAccountContextInteractionResponse>({
        skip: false,
        logins_ids: ['login0_id', 'login1_id', 'login2_id'],
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['select_account'], ui_locales: ['en'] },
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a skip Select Account Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['select_account'],
        expiresAt: new Date(Date.now() + 3600000),
        session,
      });

      const context = { grant } as SelectAccountContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(
        interactionType.handleContext(context),
      ).resolves.toStrictEqual<SelectAccountContextInteractionResponse>({
        skip: true,
        logins_ids: ['login0_id', 'login1_id', 'login2_id'],
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['select_account'], ui_locales: ['en'] },
      });
    });

    it('should return a Select Account Context Interaction Response with an empty Context.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        interactions: ['select_account'],
        expiresAt: new Date(Date.now() + 3600000),
        session,
      });

      const context = { grant } as SelectAccountContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), {});

      await expect(
        interactionType.handleContext(context),
      ).resolves.toStrictEqual<SelectAccountContextInteractionResponse>({
        skip: true,
        logins_ids: ['login0_id', 'login1_id', 'login2_id'],
        request_url: requestUrl.href,
        context: {},
      });
    });
  });

  describe('handleDecision()', () => {
    const grantParameters = { display: 'page', prompt: 'select_account', ui_locales: 'en' } as AuthorizationRequest;

    let login0: Login;
    let login1: Login;
    let session: Session;

    beforeEach(() => {
      login0 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login0_id' });
      login1 = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login1_id' });

      session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [login0, login1],
      });
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 3600000),
      });

      const context = { grant } as SelectAccountDecisionInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        AccessDeniedError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountInteractionType] Expired Grant',
        '9e2854de-27fc-4136-bd6c-c64bdba3d72a',
        { grant },
        error,
      );
    });

    it('should return a first time Select Account Decision Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        session,
      });

      const context = { grant, login: login1 } as SelectAccountDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(
        interactionType.handleDecision(context),
      ).resolves.toStrictEqual<SelectAccountDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.saveSession).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Session>({ ...session, activeLogin: login1 }),
      );

      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['select_account'] }),
      );
    });

    it('should return a subsequent Select Account Decision Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['select_account'],
        expiresAt: new Date(Date.now() + 3600000),
        session,
      });

      const context = { grant } as SelectAccountDecisionInteractionContext;

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(
        interactionType.handleDecision(context),
      ).resolves.toStrictEqual<SelectAccountDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.saveSession).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).not.toHaveBeenCalled();
    });
  });
});
