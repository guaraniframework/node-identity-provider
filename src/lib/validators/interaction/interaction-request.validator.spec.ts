import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { InteractionContext } from '../../context/interaction/interaction-context';
import { HttpRequest } from '../../http/request/http-request';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { InteractionRequest } from '../../requests/interaction/interaction-request';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionRequestValidator } from './interaction-request.validator';

jest.mock('../../logger/logger');

@Injectable()
class CustomInteractionRequestValidator extends InteractionRequestValidator {
  public readonly name: InteractionTypeName = 'login';
  public constructor(logger: Logger, @InjectAll(InteractionType) interactionTypes: InteractionType[]) {
    super(logger, interactionTypes);
  }
}

describe('Interaction Request Validator', () => {
  let validator: InteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

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
    interactionTypeMocks.forEach((interactionTypeMock) => container.bind(InteractionType).toValue(interactionTypeMock));
    container.bind(InteractionRequestValidator).toClass(CustomInteractionRequestValidator).asSingleton();

    validator = container.resolve(InteractionRequestValidator);
  });

  afterEach(() => {
    container.clear();
  });

  describe('validateContext()', () => {
    let parameters: InteractionRequest;

    const requestFactory = (data: Partial<InteractionRequest> = {}): HttpRequest => {
      removeNullishValues<InteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'consent' };
    });

    it('should return a Context Interaction Context.', async () => {
      const request = requestFactory();

      await expect(validator.validateContext(request)).resolves.toMatchObject<InteractionContext>({
        parameters,
        interactionType: interactionTypeMocks[0]!,
      });
    });
  });

  describe('validateDecision()', () => {
    let parameters: InteractionRequest;

    const requestFactory = (data: Partial<InteractionRequest> = {}): HttpRequest => {
      removeNullishValues<InteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login' };
    });

    it('should return a Decision Interaction Context.', async () => {
      const request = requestFactory();

      await expect(validator.validateDecision(request)).resolves.toMatchObject<InteractionContext>({
        parameters,
        interactionType: interactionTypeMocks[1]!,
      });
    });
  });
});
