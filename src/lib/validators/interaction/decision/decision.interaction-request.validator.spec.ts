import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { DecisionInteractionContext } from '../../../context/interaction/decision/decision.interaction-context';
import { Client } from '../../../entities/client';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../logger/logger';
import { CONTAINER } from '../../../metadata/container.token';
import { DecisionInteractionRequest } from '../../../requests/interaction/decision/decision.interaction-request';
import { DecisionInteractionRequestValidator } from './decision.interaction-request.validator';

jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../logger/logger');

@Injectable()
class CustomDecisionInteractionRequestValidator extends DecisionInteractionRequestValidator {
  public readonly name: InteractionTypeName = 'login';
  public constructor(
    logger: Logger,
    clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(InteractionType) interactionTypes: InteractionType[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes);
  }
}

describe('Decision Interaction Request Validator', () => {
  let validator: DecisionInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

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
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    interactionTypeMocks.forEach((interactionTypeMock) => container.bind(InteractionType).toValue(interactionTypeMock));

    container
      .bind(DecisionInteractionRequestValidator)
      .toClass(CustomDecisionInteractionRequestValidator)
      .asSingleton();

    validator = container.resolve(DecisionInteractionRequestValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('validate()', () => {
    let parameters: DecisionInteractionRequest;

    const requestFactory = (data: Partial<DecisionInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<DecisionInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'consent', client_id: 'client_id' };
    });

    it('should throw when failing to authenticate the Client.', async () => {
      const request = requestFactory();

      const error = new InvalidClientError('Invalid Client.');

      clientAuthenticationHandlerMock.authenticate.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.message);
    });

    it('should return a Decision Interaction Context.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      await expect(validator.validate(request)).resolves.toMatchObject<DecisionInteractionContext>({
        parameters,
        interactionType: interactionTypeMocks[0]!,
        client,
      });
    });
  });
});
