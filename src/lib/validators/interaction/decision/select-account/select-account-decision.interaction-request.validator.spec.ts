import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { SelectAccountDecisionInteractionContext } from '../../../../context/interaction/decision/select-account/select-account-decision.interaction-context';
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
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CONTAINER } from '../../../../metadata/container.token';
import { SelectAccountDecisionInteractionRequest } from '../../../../requests/interaction/decision/select-account/select-account-decision.interaction-request';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';
import { SelectAccountDecisionInteractionRequestValidator } from './select-account-decision.interaction-request.validator';

jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../logger/logger');

const invalidLoginChallenges: any[] = [undefined, ''];
const invalidLoginIds: any[] = [undefined, ''];

describe('Select Account Decision Interaction Request Validator', () => {
  let validator: SelectAccountDecisionInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByLoginChallenge: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'select_account',
    }),
  );

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(SelectAccountDecisionInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(SelectAccountDecisionInteractionRequestValidator);

    superValidateSpy = jest.spyOn(DecisionInteractionRequestValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "select_account" as its value.', () => {
      expect(validator.name).toEqual<InteractionTypeName>('select_account');
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
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
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
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[SelectAccountDecisionInteractionRequestValidator] Invalid parameter "login_challenge"',
          '2c588c79-2a0c-4792-894d-6a0aa77616fb',
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
        '[SelectAccountDecisionInteractionRequestValidator] Invalid Login Challenge',
        '5f2827db-0bab-4d40-8411-fc3b5d159cba',
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
        '[SelectAccountDecisionInteractionRequestValidator] The Grant was not issued to this Client',
        'c3eeb57e-2cfa-4fda-a221-a8078c14c5e7',
        { parameters, client },
        error,
      );
    });

    it.each(invalidLoginIds)('should throw when the provided parameter "login_id" is invalid.', async (loginId) => {
      const request = requestFactory({ login_id: loginId });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "login_id".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountDecisionInteractionRequestValidator] Invalid parameter "login_id"',
        '8e880ded-283c-4e10-9b7f-bdd274530ae9',
        { parameters, grant },
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
        client,
        session,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      const error = new InteractionRequiredError('Invalid Login Identifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InteractionRequiredError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[SelectAccountDecisionInteractionRequestValidator] Invalid Login Identifier',
        '9be0a21e-aa0e-4d97-ac99-ef6cc696e4bc',
        { parameters, grant },
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
