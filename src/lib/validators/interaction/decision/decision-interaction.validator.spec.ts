import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, INTERACTION_CLIENT_AUTHENTICATION } from '../../../constants';
import { DecisionInteractionContext } from '../../../context/interaction/decision/decision-interaction-context';
import { Client } from '../../../entities/client';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../loggers/logger';
import { DecisionInteractionRequest } from '../../../requests/interaction/decision/decision-interaction-request';
import { DecisionInteractionValidator } from './decision-interaction.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../loggers/logger');

@Injectable()
class CustomDecisionInteractionValidator extends DecisionInteractionValidator {
  public readonly name: InteractionTypeName = 'consent';
  public constructor(
    logger: Logger,
    clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(InteractionType) interactionTypes: InteractionType[],
    @InjectAll(INTERACTION_CLIENT_AUTHENTICATION) clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes, clientAuthenticationMethods);
  }
}

describe('Decision Interaction Validator', () => {
  let validator: DecisionInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(CustomDecisionInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(CustomDecisionInteractionValidator);
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
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'consent', client_id: 'client_id' };
    });

    it('should throw when failing to authenticate the Client.', async () => {
      const request = requestFactory();

      const error = new InvalidClientError('Invalid Client.');

      clientAuthenticationHandlerMock.authenticate.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.description);
    });

    it('should return a Decision Interaction Context.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      await expect(validator.validate(request)).resolves.toMatchObject<DecisionInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        client,
      });
    });
  });
});
