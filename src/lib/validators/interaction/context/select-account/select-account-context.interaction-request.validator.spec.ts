import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { SelectAccountContextInteractionContext } from '../../../../context/interaction/context/select-account/select-account-context.interaction-context';
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
import { SelectAccountContextInteractionRequest } from '../../../../requests/interaction/context/select-account/select-account-context.interaction-request';
import { addParametersToUrl } from '../../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';
import { SelectAccountContextInteractionRequestValidator } from './select-account-context.interaction-request.validator';

jest.mock('../../../../logger/logger');

const invalidLoginChallenges: any[] = [undefined, ''];

describe('Select Account Context Interaction Request Validator', () => {
  let validator: SelectAccountContextInteractionRequestValidator;
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
      name: 'select_account',
    }),
  );

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(SelectAccountContextInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(SelectAccountContextInteractionRequestValidator);

    superValidateSpy = jest.spyOn(ContextInteractionRequestValidator.prototype, 'validate');
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
    let parameters: SelectAccountContextInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    const requestFactory = (data: Partial<SelectAccountContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<SelectAccountContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'select_account', login_challenge: 'login_challenge', client_id: 'client_id' };

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
          '[SelectAccountContextInteractionRequestValidator] Invalid parameter "login_challenge"',
          '9b1dc0be-cdd1-425e-9836-f3337d985df8',
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
        '[SelectAccountContextInteractionRequestValidator] Invalid Login Challenge',
        'c62f89d1-b8f2-4e2e-b57d-67a8587bec9d',
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
        '[SelectAccountContextInteractionRequestValidator] The Grant was not issued to this Client',
        '7c5b7f2e-e2db-46ce-9f81-988d5554c744',
        { parameters, client },
        error,
      );
    });

    it('should return a Select Account Context Interaction Context.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByLoginChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<SelectAccountContextInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        grant,
        client,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
  });
});
