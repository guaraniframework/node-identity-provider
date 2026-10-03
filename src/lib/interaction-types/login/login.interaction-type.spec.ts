import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { LoginContextInteractionContext } from '../../context/interaction/context/login/login-context.interaction-context';
import { LoginDecisionInteractionContext } from '../../context/interaction/decision/login/login-decision.interaction-context';
import { LoginDecisionAcceptInteractionContext } from '../../context/interaction/decision/login/login-decision-accept.interaction-context';
import { LoginDecisionDenyInteractionContext } from '../../context/interaction/decision/login/login-decision-deny.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { UnmetAuthenticationRequirementsError } from '../../errors/unmet-authentication-requirements/unmet-authentication-requirements.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { LoginContextInteractionResponse } from '../../responses/interaction/context/login/login-context.interaction-response';
import { LoginContextInteractionResponseContext } from '../../responses/interaction/context/login/login-context.interaction-response-context';
import { LoginDecisionInteractionResponse } from '../../responses/interaction/decision/login/login-decision.interaction-response';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { LoginInteractionType } from './login.interaction-type';

jest.mock('../../logger/logger');

const nonSkipPromptAndInteractions: [string | undefined, InteractionTypeName[]][] = [
  [undefined, []],
  [undefined, ['login']],
  ['consent', []],
  ['consent', ['login']],
  ['login', []],
  ['login', ['login']],
];

const skipPromptAndInteractions: [string | undefined, InteractionTypeName[]][] = [
  [undefined, []],
  [undefined, ['login']],
  ['consent', []],
  ['consent', ['login']],
  ['login', ['login']],
];

describe('Login Interaction Type', () => {
  let interactionType: LoginInteractionType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      inactivateSessionActiveLogin: jest.fn(),
      login: jest.fn(),
      removeGrant: jest.fn(),
      saveGrant: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = { issuer: new URL('https://idp.example.com') };

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 12, 0, 0, 0, 0) });
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(LoginInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(LoginInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "login" as its value.', () => {
      expect(interactionType.name).toEqual<InteractionTypeName>('login');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;
    let now: number;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    beforeEach(() => {
      grantParameters = {
        display: 'page',
        login_hint: 'login_hint',
        ui_locales: 'en',
        acr_values: 'urn:guarani:acr:2fa',
      } as AuthorizationRequest;

      now = Date.now();
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(now - 3600000),
      });

      const context = { grant } as LoginContextInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginInteractionType] Expired Grant',
        'ed3bbf76-b645-4aa2-b808-44948d72db9f',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it.each(nonSkipPromptAndInteractions)(
      'should return a non-skip Login Context Interaction Response when the Session Active Login is null.',
      async (prompt, interactions) => {
        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          activeLogin: null,
          logins: [],
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          parameters: removeNullishValues<AuthorizationRequest>({ ...grantParameters, prompt: prompt! }),
          interactions,
          expiresAt: new Date(now + 3600000),
          client,
          session,
        });

        const context = { grant } as LoginContextInteractionContext;

        const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

        await expect(interactionType.handleContext(context)).resolves.toStrictEqual<LoginContextInteractionResponse>({
          skip: false,
          client_id: client.id,
          request_url: requestUrl.href,
          context: removeNullishValues<LoginContextInteractionResponseContext>({
            display: 'page',
            prompts: prompt?.split(' ') as Prompt[],
            login_hint: 'login_hint',
            ui_locales: ['en'],
            acr_values: ['urn:guarani:acr:2fa'],
          }),
        });

        expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      },
    );

    it('should return a non-skip Login Context Interaction Response when the Session Active Login is too old.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(now - 7200000),
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { ...grantParameters, max_age: '3600' },
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
      });

      const context = { grant } as LoginContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<LoginContextInteractionResponse>({
        skip: false,
        client_id: client.id,
        request_url: requestUrl.href,
        context: removeNullishValues<LoginContextInteractionResponseContext>({
          display: 'page',
          auth_exp: 1786500000,
          login_hint: 'login_hint',
          ui_locales: ['en'],
          acr_values: ['urn:guarani:acr:2fa'],
        }),
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(session);
    });

    it.each(skipPromptAndInteractions)(
      'should return a skip Login Context Interaction Response when the Session Active Login is not null.',
      async (prompt, interactions) => {
        const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          activeLogin: login,
          logins: [login],
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          parameters: removeNullishValues<AuthorizationRequest>({ ...grantParameters, prompt: prompt! }),
          interactions,
          expiresAt: new Date(now + 3600000),
          client,
          session,
        });

        const context = { grant } as LoginContextInteractionContext;

        const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

        await expect(interactionType.handleContext(context)).resolves.toStrictEqual<LoginContextInteractionResponse>({
          skip: true,
          client_id: client.id,
          request_url: requestUrl.href,
          context: removeNullishValues<LoginContextInteractionResponseContext>({
            display: 'page',
            prompts: prompt?.split(' ') as Prompt[],
            login_hint: 'login_hint',
            ui_locales: ['en'],
            acr_values: ['urn:guarani:acr:2fa'],
          }),
        });

        expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      },
    );

    it('should return a skip Login Context Interaction Response when the Session Active Login is not too old.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(now - 1800000),
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { ...grantParameters, max_age: '3600' },
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
      });

      const context = { grant } as LoginContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<LoginContextInteractionResponse>({
        skip: true,
        client_id: client.id,
        request_url: requestUrl.href,
        context: removeNullishValues<LoginContextInteractionResponseContext>({
          display: 'page',
          auth_exp: 1786505400,
          login_hint: 'login_hint',
          ui_locales: ['en'],
          acr_values: ['urn:guarani:acr:2fa'],
        }),
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
    });
  });

  describe('handleDecision()', () => {
    let grantParameters: AuthorizationRequest;
    let now: number;

    beforeEach(() => {
      grantParameters = {
        display: 'page',
        login_hint: 'login_hint',
        ui_locales: 'en',
        acr_values: 'urn:guarani:acr:2fa',
      } as AuthorizationRequest;

      now = Date.now();
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(now - 3600000),
      });

      const context = { grant } as LoginDecisionInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        AccessDeniedError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginInteractionType] Expired Grant',
        'ed3bbf76-b645-4aa2-b808-44948d72db9f',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    // #region Decision Accept
    it('should throw when the User Authentication fails to meet the required Authentication Context Class Reference.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        expiresAt: new Date(now + 3600000),
      });

      const context = {
        grant,
        decision: 'accept',
        acr: 'urn:guarani:acr:1fa',
      } as LoginDecisionAcceptInteractionContext;

      const error = new UnmetAuthenticationRequirementsError(
        'Could not authenticate using the Authentication Context Class Reference "urn:guarani:acr:2fa".',
      );

      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        UnmetAuthenticationRequirementsError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginInteractionType] Could not authenticate using the Authentication Context Class Reference "urn:guarani:acr:2fa"',
        'f7e07a95-dee0-482b-a244-f3abfc917462',
        { context },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a first time Login Decision Accept Interaction Response.', async () => {
      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
      });

      const user: User = Object.assign<User, User>(Reflect.construct(User, []), { id: 'user_id' });

      const context = {
        grant,
        decision: 'accept',
        user,
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      } as LoginDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<LoginDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.login).toHaveBeenCalledExactlyOnceWith(user, client, session, context.amr, context.acr);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['login'] }),
      );
    });

    it('should return a subsequent Login Decision Accept Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(now - 1800000),
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        session,
      });

      const user: User = Object.assign<User, User>(Reflect.construct(User, []), { id: 'user_id' });

      const context = {
        grant,
        decision: 'accept',
        user,
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      } as LoginDecisionAcceptInteractionContext;

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<LoginDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.login).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).not.toHaveBeenCalled();
    });
    // #endregion

    // #region Decision Deny
    it('should return a Login Decision Deny Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        expiresAt: new Date(now + 3600000),
      });

      const error = new AccessDeniedError('The User refused to authenticate.');
      const context = { grant, decision: 'deny', error } as LoginDecisionDenyInteractionContext;

      const redirectTo = addParametersToUrl(new URL('/oidc/error', settings.issuer!.href), error.toJSON());

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<LoginDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });
    // #endregion
  });
});
