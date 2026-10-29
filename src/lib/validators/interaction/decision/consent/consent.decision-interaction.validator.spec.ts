import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { Constructor, getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { ConsentAcceptDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent-accept.decision-interaction-context';
import { ConsentDenyDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent-deny.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { Scope } from '../../../../entities/scope';
import { Session } from '../../../../entities/session';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { AccountSelectionRequiredError } from '../../../../errors/account-selection-required/account-selection-required.error';
import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { InteractionRequiredError } from '../../../../errors/interaction-required/interaction-required.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { LoginRequiredError } from '../../../../errors/login-required/login-required.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { HttpRequestMethod } from '../../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { AuthorizationRequest } from '../../../../requests/authorization/authorization-request';
import { ConsentDecision } from '../../../../requests/interaction/decision/consent/consent.decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent.decision-interaction-request';
import { ConsentAcceptDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-accept.decision-interaction-request';
import { ConsentDenyDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-deny.decision-interaction-request';
import { DecisionInteractionValidator } from '../decision-interaction.validator';
import { ConsentDecisionInteractionValidator } from './consent.decision-interaction.validator';

jest.mock('../../../../client-authentication/client-authentication');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../handlers/scope/scope.handler');
jest.mock('../../../../loggers/logger');

const invalidConsentChallenges: any[] = [undefined, ''];
const invalidDecisions: any[] = [undefined, ''];
const invalidSubjectIds: any[] = [undefined, ''];
const invalidErrorCodes: any[] = [undefined, ''];
const invalidErrorDescriptions: any[] = [undefined, ''];
const invalidErrorUris: any[] = ['', 'a'];

const noLoginPromptsAndErrors: [string, IdentityProviderError][] = [
  ['create', new InteractionRequiredError('Account Creation required.')],
  ['create consent', new InteractionRequiredError('Account Creation required.')],
  ['select_account', new AccountSelectionRequiredError('Account Selection required.')],
  ['select_account consent', new AccountSelectionRequiredError('Account Selection required.')],
  ['login', new LoginRequiredError('Login required.')],
  ['login consent', new LoginRequiredError('Login required.')],
  ['', new LoginRequiredError('Login required.')],
  ['consent', new LoginRequiredError('Login required.')],
];

describe('Consent Decision Interaction Validator', () => {
  let validator: ConsentDecisionInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByConsentChallenge: jest.fn(),
      getScopesByName: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  let superValidateSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(ConsentDecisionInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(ConsentDecisionInteractionValidator);

    superValidateSpy = jest.spyOn(DecisionInteractionValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "consent" as its value.', () => {
      expect(validator.name).toBe<InteractionTypeName>('consent');
    });
  });

  describe('validate()', () => {
    let parameters: ConsentDecisionInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      subjectType: 'public',
    });

    const requestFactory = <T extends ConsentDecisionInteractionRequest = ConsentDecisionInteractionRequest>(
      data: Partial<T> = {},
    ): HttpRequest => {
      removeNullishValues<ConsentDecisionInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      // @ts-expect-error Missing decision parameter
      parameters = { interaction_type: 'consent', consent_challenge: 'consent_challenge' };

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
    });

    it.each(invalidConsentChallenges)(
      'should throw when the provided parameter "consent_challenge" is invalid.',
      async (consentChallenge) => {
        const request = requestFactory({ consent_challenge: consentChallenge });

        const error = new InvalidRequestError('Invalid parameter "consent_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionValidator] Invalid parameter "consent_challenge"',
          'e93cd171-debc-480c-a17b-92da2cfe263d',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when no Grant is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(null);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Invalid Consent Challenge',
        '4e7a0b47-797e-4e8f-a716-10923b9b70c0',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests a Grant that was not issued to itself.', async () => {
      const request = requestFactory();

      const anotherClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'another_client_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        client: anotherClient,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] The Grant was not issued to this Client',
        'ea6a88c5-adb4-4f54-8f97-879c848b1b31',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Grant is expired.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 300000),
        client,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Expired Grant',
        'd25a5b81-c749-49d0-a8e6-1d5d3529d7f6',
        { parameters, client_id: client.id },
        error,
      );
    });

    it.each(noLoginPromptsAndErrors)(
      'should throw when the Session does not have an Active Login.',
      async (prompt, error) => {
        const request = requestFactory();

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: null,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          parameters: { prompt } as AuthorizationRequest,
          expiresAt: new Date(Date.now() + 300000),
          client,
          session,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        await expect(validator.validate(request)).rejects.toThrowWithMessage(
          error.constructor as Constructor<IdentityProviderError>,
          error.description,
        );

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionValidator] No Active Login found',
          '77c50712-a8f8-4154-bbbb-e028616c149b',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it.each(invalidDecisions)('should throw when the provided parameter "decision" is invalid.', async (decision) => {
      const request = requestFactory({ decision });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "decision".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Invalid parameter "decision"',
        '2958a9e8-2244-4121-92b2-e8f5e3d867d9',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "decision" is unsupported.', async () => {
      const request = requestFactory({ decision: 'unknown' as ConsentDecision });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Unsupported Decision "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Unsupported Decision "unknown"',
        'ce5998f9-46da-4e44-9c21-9cfb77c3502e',
        { parameters },
        error,
      );
    });

    // #region Accept Decision
    it.each(invalidSubjectIds)(
      'should throw when the provided parameter "granted_scope" is invalid.',
      async (grantedScope) => {
        const request = requestFactory<ConsentAcceptDecisionInteractionRequest>({
          decision: 'accept',
          granted_scope: grantedScope,
        });

        const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: login,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          parameters: {} as AuthorizationRequest,
          expiresAt: new Date(Date.now() + 300000),
          client,
          session,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "granted_scope".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionValidator] Invalid parameter "granted_scope"',
          '9e47d7de-1242-40e2-9f72-102e2ebdb507',
          { parameters, grant_id: grant.id },
          error,
        );
      },
    );

    it('should throw when the User granted a Scope not previously requested by the Client.', async () => {
      const request = requestFactory<ConsentAcceptDecisionInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo bar baz',
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('The Scope "baz" was not requested by the Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] The Scope "baz" was not requested by the Client',
        '37aed28e-2f3b-4b24-8cb1-1438cc647cd5',
        { parameters, grant_id: grant.id },
        error,
      );
    });

    it('should return a Consent Accept Decision Interaction Context with all Scopes requested by the Client.', async () => {
      const request = requestFactory<ConsentAcceptDecisionInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo bar',
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      const grantedScopes: Scope[] = ['openid', 'foo', 'bar'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.getScopesByName.mockResolvedValueOnce(grantedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentAcceptDecisionInteractionContext>({
        parameters: parameters as ConsentAcceptDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'accept',
        grantedScopes,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a Consent Accept Decision Interaction Context with a subset of the Scopes requested by the Client.', async () => {
      const request = requestFactory<ConsentAcceptDecisionInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo',
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      const grantedScopes: Scope[] = ['openid', 'foo'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.getScopesByName.mockResolvedValueOnce(grantedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentAcceptDecisionInteractionContext>({
        parameters: parameters as ConsentAcceptDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'accept',
        grantedScopes,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
    // #endregion

    // #region Deny Decision
    it.each(invalidErrorCodes)('should throw when the provided parameter "error" is invalid.', async (errorCode) => {
      const request = requestFactory<ConsentDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: errorCode,
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Invalid parameter "error"',
        '735f8d04-b1f7-4425-86b3-02566a142fb8',
        { parameters },
        error,
      );
    });

    it.each(invalidErrorDescriptions)(
      'should throw when the provided parameter "error_description" is invalid.',
      async (errorDescription) => {
        const request = requestFactory<ConsentDenyDecisionInteractionRequest>({
          decision: 'deny',
          error: 'access_denied',
          error_description: errorDescription,
        });

        const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: login,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          parameters: {} as AuthorizationRequest,
          expiresAt: new Date(Date.now() + 300000),
          client,
          session,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "error_description".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionValidator] Invalid parameter "error_description"',
          'eca7594f-d588-4bff-9c92-37dd2aed6870',
          { parameters },
          error,
        );
      },
    );

    it.each(invalidErrorUris)('should throw when the provided parameter "error_uri" is invalid.', async (errorUri) => {
      const request = requestFactory<ConsentDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to grant the requested scope.',
        error_uri: errorUri,
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error_uri".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionValidator] Invalid parameter "error_uri"',
        'ad1717d6-8820-4920-ba0c-8270259fcf7a',
        { parameters },
        error,
      );
    });

    it('should return a Consent Deny Decision Interaction Context.', async () => {
      const request = requestFactory<ConsentDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to grant the requested scope.',
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      const error = new AccessDeniedError('The User refused to grant the requested scope.');

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentDenyDecisionInteractionContext>({
        parameters: parameters as ConsentDenyDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'deny',
        error,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a Consent Deny Decision Interaction Context with an "error_uri".', async () => {
      const request = requestFactory<ConsentDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to grant the requested scope.',
        error_uri: 'https://provider.example.com/docs/access_denied',
      });

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      const error = new AccessDeniedError('The User refused to grant the requested scope.').setUri(
        'https://provider.example.com/docs/access_denied',
      );

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentDenyDecisionInteractionContext>({
        parameters: parameters as ConsentDenyDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'deny',
        error,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
    // #endregion
  });
});
