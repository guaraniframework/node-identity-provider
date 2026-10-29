import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { ConsentContextInteractionContext } from '../../context/interaction/context/consent/consent.context-interaction-context';
import { ConsentAcceptDecisionInteractionContext } from '../../context/interaction/decision/consent/consent-accept.decision-interaction-context';
import { ConsentDenyDecisionInteractionContext } from '../../context/interaction/decision/consent/consent-deny.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Endpoint } from '../../endpoints/endpoint';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ConsentContextInteractionResponse } from '../../responses/interaction/context/consent/consent.context-interaction-response';
import { ConsentDecisionInteractionResponse } from '../../responses/interaction/decision/consent/consent.decision-interaction-response';
import { InteractionsSettings } from '../../settings/interactions/interactions.settings';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { ConsentInteractionType } from './consent.interaction-type';

jest.mock('../../loggers/logger');

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

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
      interactions: Object.assign<InteractionsSettings, Partial<InteractionsSettings>>(
        Object.create(InteractionsSettings.prototype),
        { errorUrl: new URL('https://provider.example.com/oidc/error') },
      ),
    }),
  );

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), {
      name: 'public',
      calculateSubjectIdentifier: jest.fn(),
    }),
  );

  const providerMock = jest.mocked<IdentityProvider>(
    Object.assign<IdentityProvider, Partial<IdentityProvider>>(Reflect.construct(IdentityProvider, []), {
      endpoints: [{ name: 'authorization', path: '/oidc/authorization' } as Endpoint],
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    subjectType: 'public',
  });

  const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind(IdentityProvider).toValue(providerMock);
    container.bind(ConsentInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(ConsentInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "consent" as its value.', () => {
      expect(interactionType.name).toBe<InteractionTypeName>('consent');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;

    const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
      id: 'consent_id',
    });

    beforeEach(() => {
      grantParameters = {
        scope: 'openid profile email phone address',
        display: 'page',
        prompt: 'consent',
        ui_locales: 'en-US',
      } as AuthorizationRequest;
    });

    it('should return a non-skip Consent Context Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id', user });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
        consent: null,
      });

      const context = { client, grant } as ConsentContextInteractionContext;

      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const requestUrl = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<ConsentContextInteractionResponse>({
        skip: false,
        requested_scopes: ['openid', 'profile', 'email', 'phone', 'address'],
        subject_id: 'user_id',
        request_url: requestUrl.href,
        client_id: 'client_id',
        context: { display: 'page', prompts: ['consent'], ui_locales: ['en-US'] },
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a skip Consent Context Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id', user });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { scope: 'openid profile email phone address' } as AuthorizationRequest,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
        consent,
      });

      const context = { client, grant } as ConsentContextInteractionContext;

      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce('user_id');

      const requestUrl = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

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

    // #region Decision Accept
    it('should return a valid first time Consent Decision Accept Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        clients: [],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
      });

      const grantedScopes: Scope[] = ['openid', 'profile', 'email', 'phone', 'address'].map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      const context = { client, grant, decision: 'accept', grantedScopes } as ConsentAcceptDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Login>({ ...login, clients: [client] }),
      );

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(grantedScopes, client, user);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response for a Client previously registered at the Login.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
      });

      const grantedScopes: Scope[] = ['openid', 'profile', 'email', 'phone', 'address'].map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      const context = { client, grant, decision: 'accept', grantedScopes } as ConsentAcceptDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();

      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(grantedScopes, client, user);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response with an "offline_access" Scope.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
      });

      const grantedScopes: Scope[] = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'].map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      const context = { client, grant, decision: 'accept', grantedScopes } as ConsentAcceptDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.createConsent).toHaveBeenCalledExactlyOnceWith(grantedScopes, client, user);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );
    });

    it('should return a valid first time Consent Decision Accept Interaction Response without an "offline_access" Scope.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { ...grantParameters, response_type: 'id_token token' },
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent: null,
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
      });

      const grantedScopes: Scope[] = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'].map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      const context = { client, grant, decision: 'accept', grantedScopes } as ConsentAcceptDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.saveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['consent'], consent }),
      );

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[ConsentInteractionType] Removing Scope "offline_access" for Response Type "id_token token"',
        '161dec91-0722-420d-917c-07235b9d7b32',
        { context },
      );
    });

    it('should return a valid subsequent Consent Decision Accept Interaction Response.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        clients: [client],
        user,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(now + 3600000),
        client,
        session,
        consent,
      });

      const grantedScopes: Scope[] = ['openid', 'profile', 'email', 'phone', 'address'].map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      const context = { client, grant, decision: 'accept', grantedScopes } as ConsentAcceptDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createConsent.mockResolvedValueOnce(consent);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grant.parameters,
      );

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
      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        expiresAt: new Date(now + 3600000),
        session,
      });

      const error = new AccessDeniedError('The User rejected the requested Scopes.');
      const context = { client, grant, decision: 'deny', error } as ConsentDenyDecisionInteractionContext;

      const redirectTo = addParametersToUrl(settingsMock.interactions.errorUrl, error.toJSON());

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<ConsentDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });
    // #endregion
  });
});
