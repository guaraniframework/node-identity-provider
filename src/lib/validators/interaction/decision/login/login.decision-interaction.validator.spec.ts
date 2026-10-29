import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { LoginAcceptDecisionInteractionContext } from '../../../../context/interaction/decision/login/login-accept.decision-interaction-context';
import { LoginDenyDecisionInteractionContext } from '../../../../context/interaction/decision/login/login-deny.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { User } from '../../../../entities/user';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { HttpRequestMethod } from '../../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { LoginDecision } from '../../../../requests/interaction/decision/login/login.decision';
import { LoginDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login.decision-interaction-request';
import { LoginAcceptDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login-accept.decision-interaction-request';
import { LoginDenyDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login-deny.decision-interaction-request';
import { Settings } from '../../../../settings/settings';
import { SubjectType } from '../../../../subject-types/subject-type';
import { DecisionInteractionValidator } from '../decision-interaction.validator';
import { LoginDecisionInteractionValidator } from './login.decision-interaction.validator';

jest.mock('../../../../client-authentication/client-authentication');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../loggers/logger');

const invalidLoginChallenges: any[] = [undefined, ''];
const invalidDecisions: any[] = [undefined, ''];
const invalidSubjectIds: any[] = [undefined, ''];
const invalidErrorCodes: any[] = [undefined, ''];
const invalidErrorDescriptions: any[] = [undefined, ''];
const invalidErrorUris: any[] = ['', 'a'];

describe('Login Decision Interaction Validator', () => {
  let validator: LoginDecisionInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByLoginChallenge: jest.fn(),
      findUserById: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
    }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'login',
    }),
  );

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), {
      name: 'public',
      retrieveSubjectIdentifier: jest.fn(),
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
    container.bind(Settings).toValue(settingsMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(LoginDecisionInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(LoginDecisionInteractionValidator);

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
    it('should have "login" as its value.', () => {
      expect(validator.name).toBe<InteractionTypeName>('login');
    });
  });

  describe('validate()', () => {
    let parameters: LoginDecisionInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'client_id',
      subjectType: 'public',
    });

    const requestFactory = <T extends LoginDecisionInteractionRequest = LoginDecisionInteractionRequest>(
      data: Partial<T> = {},
    ): HttpRequest => {
      removeNullishValues<LoginDecisionInteractionRequest>(Object.assign(parameters, data));

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
      parameters = { interaction_type: 'login', login_challenge: 'login_challenge' };

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
    });

    it.each(invalidLoginChallenges)(
      'should throw when the provided parameter "login_challenge" is invalid.',
      async (loginChallenge) => {
        const request = requestFactory({ login_challenge: loginChallenge });

        const error = new InvalidRequestError('Invalid parameter "login_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionValidator] Invalid parameter "login_challenge"',
          '256c4032-69d7-42b7-9531-6a6fb1665169',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when no Grant is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(null);

      const error = new AccessDeniedError('Invalid Login Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid Login Challenge',
        '29753f1d-034b-47dd-8b02-fbccaf22107b',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests a Grant that was not issued to itself.', async () => {
      const request = requestFactory();

      const anotherClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'another_client_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client: anotherClient,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Login Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] The Grant was not issued to this Client',
        '0825051f-6751-4f0a-871e-75def43520e3',
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

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Login Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Expired Grant',
        '3824dacd-e50c-4739-9a92-0e95e5f1c437',
        { parameters, client_id: client.id },
        error,
      );
    });

    it.each(invalidDecisions)('should throw when the provided parameter "decision" is invalid.', async (decision) => {
      const request = requestFactory({ decision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "decision".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid parameter "decision"',
        'f9681f7d-a25d-4b3c-8d08-8219b75f91ba',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "decision" is unsupported.', async () => {
      const request = requestFactory({ decision: 'unknown' as LoginDecision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Unsupported Decision "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Unsupported Decision "unknown"',
        '7d94f4a7-d80e-4b9d-8c46-dde15cf7863f',
        { parameters },
        error,
      );
    });

    // #region Accept Decision
    it.each(invalidSubjectIds)(
      'should throw when the provided parameter "subject_id" is invalid.',
      async (subjectId) => {
        const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
          decision: 'accept',
          subject_id: subjectId,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          expiresAt: new Date(Date.now() + 300000),
          client,
        });

        dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "subject_id".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionValidator] Invalid parameter "subject_id"',
          '6ca68f17-282c-49f0-ba8e-72b19e27791e',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when no User is found.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(null);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new AccessDeniedError('Invalid Subject Identifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid Subject Identifier',
        '54ee3b7e-1e91-49df-a9d7-a2c5cb767e55',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the provided parameter "amr" is invalid.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        amr: '',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Invalid parameter "amr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid parameter "amr"',
        'a5d8b5be-9965-432c-a8a0-b0fa95febb25',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr" is invalid.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        acr: '',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Invalid parameter "acr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid parameter "acr"',
        '34501b31-ea83-4b33-bdc5-08cc3000e3ed',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr" is unsupported.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        acr: 'phr',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Unsupported Authentication Context Class Reference "phr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Unsupported Authentication Context Class Reference "phr"',
        'ffce7709-46e1-481d-8315-5fd9a7e38936',
        { parameters },
        error,
      );
    });

    it('should return a complete Login Accept Decision Interaction Context.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        amr: 'pwd sms',
        acr: 'urn:guarani:acr:2fa',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginAcceptDecisionInteractionContext>({
        parameters: parameters as LoginAcceptDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'accept',
        user,
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a simple Login Accept Decision Interaction Context.', async () => {
      const request = requestFactory<LoginAcceptDecisionInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginAcceptDecisionInteractionContext>({
        parameters: parameters as LoginAcceptDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'accept',
        user,
        amr: [],
        acr: '0',
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
    // #endregion

    // #region Deny Decision
    it.each(invalidErrorCodes)('should throw when the provided parameter "error" is invalid.', async (errorCode) => {
      const request = requestFactory<LoginDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: errorCode,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid parameter "error"',
        '175ffdb6-cdda-480d-8523-8e211f399b6a',
        { parameters },
        error,
      );
    });

    it.each(invalidErrorDescriptions)(
      'should throw when the provided parameter "error_description" is invalid.',
      async (errorDescription) => {
        const request = requestFactory<LoginDenyDecisionInteractionRequest>({
          decision: 'deny',
          error: 'access_denied',
          error_description: errorDescription,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          expiresAt: new Date(Date.now() + 300000),
          client,
        });

        dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "error_description".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionValidator] Invalid parameter "error_description"',
          '575214ec-e871-487a-9e2b-7b2c71450d1c',
          { parameters },
          error,
        );
      },
    );

    it.each(invalidErrorUris)('should throw when the provided parameter "error_uri" is invalid.', async (errorUri) => {
      const request = requestFactory<LoginDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to authenticate.',
        error_uri: errorUri,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error_uri".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionValidator] Invalid parameter "error_uri"',
        'd5be0760-94d6-41d6-9b92-d39eca0bc102',
        { parameters },
        error,
      );
    });

    it('should return a Login Deny Decision Interaction Context.', async () => {
      const request = requestFactory<LoginDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to authenticate.',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      const error = new AccessDeniedError('The User refused to authenticate.');

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginDenyDecisionInteractionContext>({
        parameters: parameters as LoginDenyDecisionInteractionRequest,
        interactionType: interactionTypeMock,
        client,
        grant,
        decision: 'deny',
        error,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a Login Deny Decision Interaction Context with an "error_uri".', async () => {
      const request = requestFactory<LoginDenyDecisionInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to authenticate.',
        error_uri: 'https://provider.example.com/docs/access_denied',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      const error = new AccessDeniedError('The User refused to authenticate.').setUri(
        'https://provider.example.com/docs/access_denied',
      );

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginDenyDecisionInteractionContext>({
        parameters: parameters as LoginDenyDecisionInteractionRequest,
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
