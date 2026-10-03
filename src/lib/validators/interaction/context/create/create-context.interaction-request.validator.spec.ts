import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CreateContextInteractionContext } from '../../../../context/interaction/context/create/create-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CONTAINER } from '../../../../metadata/container.token';
import { CreateContextInteractionRequest } from '../../../../requests/interaction/context/create/create-context.interaction-request';
import { addParametersToUrl } from '../../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';
import { CreateContextInteractionRequestValidator } from './create-context.interaction-request.validator';

jest.mock('../../../../logger/logger');

const invalidLoginChallenges: any[] = [undefined, ''];

describe('Create Context Interaction Request Validator', () => {
  let validator: CreateContextInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
      findGrantByLoginChallenge: jest.fn(),
    }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'create',
    }),
  );

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(CreateContextInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(CreateContextInteractionRequestValidator);

    superValidateSpy = jest.spyOn(ContextInteractionRequestValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "create" as its value.', () => {
      expect(validator.name).toEqual<InteractionTypeName>('create');
    });
  });

  describe('validate()', () => {
    let parameters: CreateContextInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    const requestFactory = (data: Partial<CreateContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<CreateContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'create', login_challenge: 'login_challenge', client_id: 'client_id' };

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
    });

    it.each(invalidLoginChallenges)(
      'should throw when the provided parameter "login_challenge" is invalid.',
      async (loginChallenge) => {
        const request = requestFactory({ login_challenge: loginChallenge });

        const error = new InvalidRequestError('Invalid parameter "login_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CreateContextInteractionRequestValidator] Invalid parameter "login_challenge"',
          '48003fdf-53f8-43ea-aa9b-12ce30566454',
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
        '[CreateContextInteractionRequestValidator] Invalid Login Challenge',
        '809a7cdd-1aa9-4a00-90e9-6f47c6e0a0b6',
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
        '[CreateContextInteractionRequestValidator] The Grant was not issued to this Client',
        '2aa14a3a-4930-410c-8b2c-a21c780ac87b',
        { parameters, client },
        error,
      );
    });

    it('should return a Create Context Interaction Context.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<CreateContextInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        grant,
        client,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
  });
});
