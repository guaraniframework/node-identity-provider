import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ConsentContextInteractionContext } from '../../context/interaction/context/consent/consent-context.interaction-context';
import { ConsentDecisionInteractionContext } from '../../context/interaction/decision/consent/consent-decision.interaction-context';
import { ConsentDecisionAcceptInteractionContext } from '../../context/interaction/decision/consent/consent-decision-accept.interaction-context';
import { ConsentDecisionDenyInteractionContext } from '../../context/interaction/decision/consent/consent-decision-deny.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { AccountSelectionRequiredError } from '../../errors/account-selection-required/account-selection-required.error';
import { InteractionRequiredError } from '../../errors/interaction-required/interaction-required.error';
import { LoginRequiredError } from '../../errors/login-required/login-required.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ConsentContextInteractionResponse } from '../../responses/interaction/context/consent/consent-context.interaction-response';
import { ConsentDecisionInteractionResponse } from '../../responses/interaction/decision/consent/consent-decision.interaction-response';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { SubjectType } from '../../subject-types/subject-type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { ConsentInteractionType } from './consent.interaction-type';

jest.mock('../../logger/logger');

describe('Consent Interaction Type', () => {
  let interactionType: ConsentInteractionType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createConsent: jest.fn(),
      removeGrant: jest.fn(),
      saveGrant: jest.fn(),
      saveLogin: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = { issuer: new URL('https://idp.example.com') };

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), {
      name: 'public',
      calculateSubjectIdentifier: jest.fn(),
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    subjectType: 'public',
  });

  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 12, 0, 0, 0, 0) });
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind(ConsentInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(ConsentInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "consent" as its value.', () => {
      expect(interactionType.name).toEqual<InteractionTypeName>('consent');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;
    let now: number;

    const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
      id: 'consent_id',
    });

    beforeEach(() => {
      grantParameters = {
        scope: 'openid profile email phone address',
        display: 'page',
        prompt: 'consent',
        ui_locales: 'en',
      } as AuthorizationRequest;

      now = Date.now();
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(now - 3600000),
      });

      const context = { grant } as ConsentContextInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] Expired Grant',
        '1d989e45-c377-4915-ae7b-22adddc41868',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should throw when the Active Login of the Session is null and the Authorization Request prompt includes "create".', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { prompt: 'create consent' } as AuthorizationRequest,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const context = { grant } as ConsentContextInteractionContext;

      const error = new InteractionRequiredError('Account Creation required.');

      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(
        InteractionRequiredError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] No Active Login found',
        'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should throw when the Active Login of the Session is null and the Authorization Request prompt includes "select_account".', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { prompt: 'select_account consent' } as AuthorizationRequest,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const context = { grant } as ConsentContextInteractionContext;

      const error = new AccountSelectionRequiredError('Account Selection required.');

      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(
        AccountSelectionRequiredError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] No Active Login found',
        'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it.each(['login consent', undefined])(
      'should throw when the Active Login of the Session is null and the Authorization Request prompt includes "login" or is empty.',
      async (prompt) => {
        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          activeLogin: null,
          logins: [],
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          parameters: removeNullishValues({ prompt } as AuthorizationRequest),
          expiresAt: new Date(now + 3600000),
          session,
        });

        const context = { grant } as ConsentContextInteractionContext;

        const error = new LoginRequiredError('Login required.');

        await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(
          LoginRequiredError,
          error.message,
        );

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentInteractionType] No Active Login found',
          'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
          { grant },
          error,
        );

        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
      },
    );

    it('should return a non-skip Consent Context Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id', user });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
        consent: null,
      });

      const context = { grant } as ConsentContextInteractionContext;

      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<ConsentContextInteractionResponse>({
        skip: false,
        requested_scopes: ['openid', 'profile', 'email', 'phone', 'address'],
        subject_id: 'user_id',
        request_url: requestUrl.href,
        client_id: 'client_id',
        context: { display: 'page', prompts: ['consent'], ui_locales: ['en'] },
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a skip Consent Context Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id', user });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { scope: 'openid profile email phone address' } as AuthorizationRequest,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
        consent,
      });

      const context = { grant } as ConsentContextInteractionContext;

      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<ConsentContextInteractionResponse>({
        skip: true,
        requested_scopes: ['openid', 'profile', 'email', 'phone', 'address'],
        subject_id: 'user_id',
        request_url: requestUrl.href,
        client_id: 'client_id',
        context: {},
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });
  });

  describe('handleDecision()', () => {
    let now: number;

    const grantParameters = {
      response_type: 'code id_token',
      display: 'page',
      prompt: 'consent',
      ui_locales: 'en',
    } as AuthorizationRequest;

    beforeEach(() => {
      now = Date.now();
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(now - 3600000),
      });

      const context = { grant } as ConsentDecisionInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        AccessDeniedError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] Expired Grant',
        '1d989e45-c377-4915-ae7b-22adddc41868',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should throw when the Active Login of the Session is null and the Authorization Request prompt includes "create".', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { prompt: 'create consent' } as AuthorizationRequest,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const context = { grant } as ConsentDecisionInteractionContext;

      const error = new InteractionRequiredError('Account Creation required.');

      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        InteractionRequiredError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] No Active Login found',
        'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should throw when the Active Login of the Session is null and the Authorization Request prompt includes "select_account".', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { prompt: 'select_account consent' } as AuthorizationRequest,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const context = { grant } as ConsentDecisionInteractionContext;

      const error = new AccountSelectionRequiredError('Account Selection required.');

      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        AccountSelectionRequiredError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentInteractionType] No Active Login found',
        'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it.each(['login consent', undefined])(
      'should throw when the Active Login of the Session is null and the Authorization Request prompt includes "login" or is empty.',
      async (prompt) => {
        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          activeLogin: null,
          logins: [],
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          parameters: removeNullishValues({ prompt } as AuthorizationRequest),
          expiresAt: new Date(now + 3600000),
          session,
        });

        const context = { grant } as ConsentDecisionInteractionContext;

        const error = new LoginRequiredError('Login required.');

        await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
          LoginRequiredError,
          error.message,
        );

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentInteractionType] No Active Login found',
          'd097bc5e-98c2-4f7b-a425-ac07262f42d5',
          { grant },
          error,
        );

        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
      },
    );

    // #region Decision Accept
    it('should return a valid first time Consent Decision Accept Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        clients: [],
        user,
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
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
      });

      const context = {
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'profile', 'email', 'phone', 'address'],
      } as ConsentDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Login>({ ...login, clients: [client] }),
      );

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(
        ['openid', 'profile', 'email', 'phone', 'address'],
        client,
        user,
      );

      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response for a Client previously registered at the Login.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        clients: [client],
        user,
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
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
      });

      const context = {
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'profile', 'email', 'phone', 'address'],
      } as ConsentDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(
        ['openid', 'profile', 'email', 'phone', 'address'],
        client,
        user,
      );

      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response with an "offline_access" Scope.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        clients: [client],
        user,
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
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
      });

      const context = {
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
      } as ConsentDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(
        ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
        client,
        user,
      );

      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response without an "offline_access" Scope.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { ...grantParameters, response_type: 'id_token token' },
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
      });

      const context = {
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
      } as ConsentDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(
        ['openid', 'profile', 'email', 'phone', 'address'],
        client,
        user,
      );

      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[ConsentInteractionType] Removing Scope "offline_access" for response_type "id_token token"',
        '161dec91-0722-420d-917c-07235b9d7b32',
        { context },
      );
    });

    it('should return a valid subsequent Consent Decision Accept Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent,
      });

      const context = {
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'profile', 'email', 'phone', 'address'],
      } as ConsentDecisionAcceptInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grant.parameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.createConsent).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).not.toHaveBeenCalled();
    });
    // #endregion

    // #region Decision Deny
    it('should return a Consent Decision Deny Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const error = new AccessDeniedError('The User rejected the requested Scopes.');
      const context = { grant, decision: 'deny', error } as ConsentDecisionDenyInteractionContext;

      const redirectTo = addParametersToUrl(new URL('/oidc/error', settings.issuer!.href), error.toJSON());

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });
    // #endregion
  });
});
