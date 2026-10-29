import { Buffer } from 'buffer';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../../constants';
import { ContextInteractionContext } from '../../../context/interaction/context/context-interaction-context';
import { DataAccess } from '../../../data-access/data-access';
import { EndpointName } from '../../../endpoints/endpoint-name.type';
import { Client } from '../../../entities/client';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../loggers/logger';
import { ContextInteractionRequest } from '../../../requests/interaction/context/context-interaction-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionValidator } from './context-interaction.validator';

jest.mock('../../../loggers/logger');

const invalidClientIds: any[] = [undefined, ''];

@Injectable()
class CustomContextInteractionValidator extends ContextInteractionValidator {
  public readonly name: InteractionTypeName = 'login';
  public constructor(
    logger: Logger,
    dataAccess: DataAccess,
    @InjectAll(InteractionType) interactionTypes: InteractionType[],
  ) {
    super(logger, dataAccess, interactionTypes);
  }
}

describe('Context Interaction Validator', () => {
  let validator: ContextInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
    }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'login',
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(ContextInteractionValidator).toClass(CustomContextInteractionValidator).asSingleton();

    validator = container.resolve(ContextInteractionValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoint', () => {
    it('should have "interaction" as its value.', () => {
      expect(validator.endpoint).toBe<EndpointName>('interaction');
    });
  });

  describe('supportedHttpRequestMethods', () => {
    it('should have ["GET"] as its value.', () => {
      expect(validator.supportedHttpRequestMethods).toStrictEqual<HttpRequestMethod[]>([HttpRequestMethod.GET]);
    });
  });

  describe('validate()', () => {
    let parameters: ContextInteractionRequest;

    const requestFactory = (data: Partial<ContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<ContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: addParametersToUrl('https://provider.example.com/oidc/interaction', parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login', client_id: 'client_id' };
    });

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory({ client_id: clientId });
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomContextInteractionValidator] Invalid parameter "client_id"',
        '709ad3dd-cf9e-4779-b62e-47b19ca5f76b',
        { parameters },
        error,
      );
    });

    it('should throw when the Client is not registered.', async () => {
      const request = requestFactory();

      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Invalid Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomContextInteractionValidator] Invalid Client',
        'fba65d38-17bd-4391-90b3-011df1945964',
        { parameters },
        error,
      );
    });

    it('should return a Context Interaction Context.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      await expect(validator.validate(request)).resolves.toMatchObject<ContextInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        client,
      });
    });
  });
});
