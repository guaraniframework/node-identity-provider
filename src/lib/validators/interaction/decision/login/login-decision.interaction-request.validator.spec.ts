import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { LoginDecisionAcceptInteractionContext } from '../../../../context/interaction/decision/login/login-decision-accept.interaction-context';
import { LoginDecisionDenyInteractionContext } from '../../../../context/interaction/decision/login/login-decision-deny.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { User } from '../../../../entities/user';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CONTAINER } from '../../../../metadata/container.token';
import { LoginDecision } from '../../../../requests/interaction/decision/login/login-decision';
import { LoginDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision.interaction-request';
import { LoginDecisionAcceptInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision-accept.interaction-request';
import { LoginDecisionDenyInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision-deny.interaction-request';
import { Settings } from '../../../../settings/settings';
import { SETTINGS } from '../../../../settings/settings.token';
import { SubjectType } from '../../../../subject-types/subject-type';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';
import { LoginDecisionInteractionRequestValidator } from './login-decision.interaction-request.validator';

jest.mock('../../../../logger/logger');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');

const invalidLoginChallenges: any[] = [undefined, ''];
const invalidDecisions: any[] = [undefined, ''];
const invalidSubjectIds: any[] = [undefined, ''];
const invalidErrorCodes: any[] = [undefined, ''];
const invalidErrorDescriptions: any[] = [undefined, ''];

describe('Login Decision Interaction Request Validator', () => {
  let validator: LoginDecisionInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByLoginChallenge: jest.fn(),
      findUserById: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const settings: Partial<Settings> = { acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'] };

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

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind(LoginDecisionInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(LoginDecisionInteractionRequestValidator);

    superValidateSpy = jest.spyOn(DecisionInteractionRequestValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "login" as its value.', () => {
      expect(validator.name).toEqual<InteractionTypeName>('login');
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
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
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
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionRequestValidator] Invalid parameter "login_challenge"',
          '256c4032-69d7-42b7-9531-6a6fb1665169',
          { parameters, client },
          error,
        );
      },
    );

    it('should throw when no Grant is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(null);

      const error = new AccessDeniedError('Invalid Login Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid Login Challenge',
        '29753f1d-034b-47dd-8b02-fbccaf22107b',
        { parameters, client },
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
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] The Grant was not issued to this Client',
        '0825051f-6751-4f0a-871e-75def43520e3',
        { parameters, client },
        error,
      );
    });

    it.each(invalidDecisions)('should throw when the provided parameter "decision" is invalid.', async (decision) => {
      const request = requestFactory({ decision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "decision".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid parameter "decision"',
        'f9681f7d-a25d-4b3c-8d08-8219b75f91ba',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "decision" is unsupported.', async () => {
      const request = requestFactory({ decision: 'unknown' as LoginDecision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Unsupported decision "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Unsupported decision "unknown"',
        '7d94f4a7-d80e-4b9d-8c46-dde15cf7863f',
        { parameters },
        error,
      );
    });

    // #region Decision Accept
    it.each(invalidSubjectIds)(
      'should throw when the provided parameter "subject_id" is invalid.',
      async (subjectId) => {
        const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
          decision: 'accept',
          subject_id: subjectId,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          client,
        });

        dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "subject_id".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionRequestValidator] Invalid parameter "subject_id"',
          '6ca68f17-282c-49f0-ba8e-72b19e27791e',
          { parameters, client },
          error,
        );
      },
    );

    it('should throw when no User is found.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(null);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new AccessDeniedError('Invalid Subject Identifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid Subject Identifier',
        '54ee3b7e-1e91-49df-a9d7-a2c5cb767e55',
        { parameters, client },
        error,
      );
    });

    it('should throw when the provided parameter "amr" is invalid.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        amr: '',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Invalid parameter "amr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid parameter "amr"',
        'a5d8b5be-9965-432c-a8a0-b0fa95febb25',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr" is invalid.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        acr: '',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Invalid parameter "acr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid parameter "acr"',
        '34501b31-ea83-4b33-bdc5-08cc3000e3ed',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr" is unsupported.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        acr: 'phr',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      const error = new InvalidRequestError('Unsupported Authentication Context Class Reference "phr".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Unsupported Authentication Context Class Reference "phr"',
        'ffce7709-46e1-481d-8315-5fd9a7e38936',
        { parameters },
        error,
      );
    });

    it('should return a complete Login Decision Accept Interaction Context.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
        amr: 'pwd sms',
        acr: 'urn:guarani:acr:2fa',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginDecisionAcceptInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
        client,
        grant,
        decision: 'accept',
        user,
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a simple Login Decision Accept Interaction Context.', async () => {
      const request = requestFactory<LoginDecisionAcceptInteractionRequest>({
        decision: 'accept',
        subject_id: 'user_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginDecisionAcceptInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
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

    // #region Decision Deny
    it.each(invalidErrorCodes)('should throw when the provided parameter "error" is invalid.', async (errorCode) => {
      const request = requestFactory<LoginDecisionDenyInteractionRequest>({
        decision: 'deny',
        error: errorCode,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[LoginDecisionInteractionRequestValidator] Invalid parameter "error"',
        '175ffdb6-cdda-480d-8523-8e211f399b6a',
        { parameters },
        error,
      );
    });

    it.each(invalidErrorDescriptions)(
      'should throw when the provided parameter "error_description" is invalid.',
      async (errorDescription) => {
        const request = requestFactory<LoginDecisionDenyInteractionRequest>({
          decision: 'deny',
          error: 'access_denied',
          error_description: errorDescription,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          client,
        });

        dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "error_description".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[LoginDecisionInteractionRequestValidator] Invalid parameter "error_description"',
          '575214ec-e871-487a-9e2b-7b2c71450d1c',
          { parameters },
          error,
        );
      },
    );

    it('should return a Login Decision Deny Interaction Context.', async () => {
      const request = requestFactory<LoginDecisionDenyInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to authenticate.',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });
      const error = new AccessDeniedError('The User refused to authenticate.');

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);
      dataAccessMock.findUserById.mockResolvedValueOnce(user);
      subjectTypeMock.retrieveSubjectIdentifier.mockReturnValueOnce('user_id');

      await expect(validator.validate(request)).resolves.toMatchObject<LoginDecisionDenyInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
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
