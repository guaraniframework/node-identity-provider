import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { CreateDecisionInteractionContext } from '../../../../context/interaction/decision/create/create.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { HttpRequestMethod } from '../../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { CreateDecisionInteractionRequest } from '../../../../requests/interaction/decision/create/create.decision-interaction-request';
import { DecisionInteractionValidator } from '../decision-interaction.validator';
import { CreateDecisionInteractionValidator } from './create.decision-interaction.validator';

jest.mock('../../../../client-authentication/client-authentication');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../loggers/logger');

const invalidLoginChallenges: any[] = [undefined, ''];

describe('Create Decision Interaction Validator', () => {
  let validator: CreateDecisionInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByLoginChallenge: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'create',
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
    container.bind(CreateDecisionInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(CreateDecisionInteractionValidator);

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
    it('should have "create" as its value.', () => {
      expect(validator.name).toBe<InteractionTypeName>('create');
    });
  });

  describe('validate()', () => {
    let parameters: CreateDecisionInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    const requestFactory = (data: Partial<CreateDecisionInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<CreateDecisionInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = {
        interaction_type: 'create',
        login_challenge: 'login_challenge',
        email: 'john.doe@email.com',
        password: 'S3cr&tP4sSw0rD',
      };

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
          '[CreateDecisionInteractionValidator] Invalid parameter "login_challenge"',
          '47818932-4e0e-4142-961f-f1057d9bef15',
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
        '[CreateDecisionInteractionValidator] Invalid Login Challenge',
        '5ab65044-b4e6-4bf0-b5d4-d3770087dba2',
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
        '[CreateDecisionInteractionValidator] The Grant was not issued to this Client',
        'c7e03e04-8801-48fa-9046-fd1602d5698d',
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
        '[CreateDecisionInteractionValidator] Expired Grant',
        '35a38165-4c46-4c6a-81f7-b6d3100344ad',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should return a Create Decision Interaction Context.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() + 300000),
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<CreateDecisionInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        grant,
        client,
        data: { email: 'john.doe@email.com', password: 'S3cr&tP4sSw0rD' },
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
  });
});
