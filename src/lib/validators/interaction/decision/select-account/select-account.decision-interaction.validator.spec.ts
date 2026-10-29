import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { SelectAccountDecisionInteractionContext } from '../../../../context/interaction/decision/select-account/select-account.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { Session } from '../../../../entities/session';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InteractionRequiredError } from '../../../../errors/interaction-required/interaction-required.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { HttpRequestMethod } from '../../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { SelectAccountDecisionInteractionRequest } from '../../../../requests/interaction/decision/select-account/select-account.decision-interaction-request';
import { DecisionInteractionValidator } from '../decision-interaction.validator';
import { SelectAccountDecisionInteractionValidator } from './select-account.decision-interaction.validator';

jest.mock('../../../../client-authentication/client-authentication');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../loggers/logger');

const invalidLoginChallenges: any[] = [undefined, ''];
const invalidLoginIds: any[] = [undefined, ''];

describe('Select Account Decision Interaction Request Validator', () => {
  let validator: SelectAccountDecisionInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByLoginChallenge: jest.fn(),
      logout: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'select_account',
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
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(SelectAccountDecisionInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(SelectAccountDecisionInteractionValidator);

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
    it('should have "select_account" as its value.', () => {
      expect(validator.name).toBe<InteractionTypeName>('select_account');
    });
  });

  describe('validate()', () => {
    let parameters: SelectAccountDecisionInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    const requestFactory = (data: Partial<SelectAccountDecisionInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<SelectAccountDecisionInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'select_account', login_challenge: 'login_challenge', login_id: 'login_id' };

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
          '[SelectAccountDecisionInteractionValidator] Invalid parameter "login_challenge"',
          '2c588c79-2a0c-4792-894d-6a0aa77616fb',
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
        '[SelectAccountDecisionInteractionValidator] Invalid Login Challenge',
        '5f2827db-0bab-4d40-8411-fc3b5d159cba',
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
        '[SelectAccountDecisionInteractionValidator] The Grant was not issued to this Client',
        'c3eeb57e-2cfa-4fda-a221-a8078c14c5e7',
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
        '[SelectAccountDecisionInteractionValidator] Expired Grant',
        '1106c4ca-796d-4779-a10b-f9296437c74e',
        { parameters, client_id: client.id },
        error,
      );
    });

    it.each(invalidLoginIds)('should throw when the provided parameter "login_id" is invalid.', async (loginId) => {
      const request = requestFactory({ login_id: loginId });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "login_id".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountDecisionInteractionValidator] Invalid parameter "login_id"',
        '8e880ded-283c-4e10-9b7f-bdd274530ae9',
        { parameters, grant_id: grant.id },
        error,
      );
    });

    it('should throw when the Session of the Grant does not have the requested Login.', async () => {
      const request = requestFactory();

      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'another_login_id',
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InteractionRequiredError('Invalid Login Identifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InteractionRequiredError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountDecisionInteractionValidator] Invalid Login Identifier',
        '9be0a21e-aa0e-4d97-ac99-ef6cc696e4bc',
        { parameters, grant_id: grant.id },
        error,
      );
    });

    it('should throw when the requested Login is expired.', async () => {
      const request = requestFactory();

      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        expiresAt: new Date(Date.now() - 300000),
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InteractionRequiredError('Invalid Login Identifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InteractionRequiredError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(login, session);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountDecisionInteractionValidator] Expired Login',
        'c90b253f-4b57-4d8d-817c-68daa89a3a23',
        { parameters, login_id: login.id },
        error,
      );
    });

    it('should return a Select Account Decision Interaction Context.', async () => {
      const request = requestFactory();

      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        logins: [login],
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<SelectAccountDecisionInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        grant,
        client,
        login,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
  });
});
