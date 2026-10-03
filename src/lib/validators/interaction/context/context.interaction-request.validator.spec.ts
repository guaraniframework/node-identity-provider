import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ContextInteractionContext } from '../../../context/interaction/context/context.interaction-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../http/request/http-request';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../logger/logger';
import { CONTAINER } from '../../../metadata/container.token';
import { ContextInteractionRequest } from '../../../requests/interaction/context/context.interaction-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionRequestValidator } from './context.interaction-request.validator';

jest.mock('../../../logger/logger');

const invalidClientIds: any[] = [undefined, ''];

@Injectable()
class CustomContextInteractionRequestValidator extends ContextInteractionRequestValidator {
  public readonly name: InteractionTypeName = 'login';
  public constructor(
    logger: Logger,
    dataAccess: DataAccess,
    @InjectAll(InteractionType) interactionTypes: InteractionType[],
  ) {
    super(logger, dataAccess, interactionTypes);
  }
}

describe('Context Interaction Request Validator', () => {
  let validator: ContextInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
    }),
  );

  const interactionTypeMocks = [
    jest.mocked<InteractionType>(
      Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
        name: 'consent',
      }),
    ),
    jest.mocked<InteractionType>(
      Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
        name: 'login',
      }),
    ),
  ];

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    interactionTypeMocks.forEach((interactionTypeMock) => container.bind(InteractionType).toValue(interactionTypeMock));
    container.bind(ContextInteractionRequestValidator).toClass(CustomContextInteractionRequestValidator).asSingleton();

    validator = container.resolve(ContextInteractionRequestValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('validate()', () => {
    let parameters: ContextInteractionRequest;

    const requestFactory = (data: Partial<ContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<ContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login', client_id: 'client_id' };
    });

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory({ client_id: clientId });
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomContextInteractionRequestValidator] Invalid parameter "client_id"',
        '709ad3dd-cf9e-4779-b62e-47b19ca5f76b',
        { parameters },
        error,
      );
    });

    it('should throw when the Client is not registered.', async () => {
      const request = requestFactory();

      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Invalid Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomContextInteractionRequestValidator] Invalid Client',
        'fba65d38-17bd-4391-90b3-011df1945964',
        { parameters },
        error,
      );
    });

    it('should return a Context Interaction Context.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      await expect(validator.validate(request)).resolves.toMatchObject<ContextInteractionContext>({
        parameters,
        interactionType: interactionTypeMocks[1]!,
        client,
      });
    });
  });
});
