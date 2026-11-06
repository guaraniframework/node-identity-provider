import { Buffer } from 'buffer';
import qs from 'querystring';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { MethodNotAllowedError } from '../../errors/method-not-allowed/method-not-allowed.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { InteractionRequest } from '../../requests/interaction/interaction-request';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionValidator } from './interaction.validator';

jest.mock('../../loggers/logger');

@Injectable()
class CustomInteractionValidator extends InteractionValidator {
  public override readonly name: InteractionTypeName = 'consent';
  public constructor(logger: Logger, @InjectAll(InteractionType) interactionTypes: InteractionType[]) {
    super(logger, interactionTypes);
  }
}

const invalidHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.DELETE, HttpRequestMethod.PUT];

describe('Interaction Validator', () => {
  let validator: CustomInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(CustomInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(CustomInteractionValidator);
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
    it('should have ["GET", "POST"] as its value.', () => {
      expect(validator.supportedHttpRequestMethods).toStrictEqual<HttpRequestMethod[]>([
        HttpRequestMethod.GET,
        HttpRequestMethod.POST,
      ]);
    });
  });

  describe('validate()', () => {
    let parameters: InteractionRequest;

    const requestFactory = (method: HttpRequestMethod, data: Partial<InteractionRequest> = {}): HttpRequest => {
      removeNullishValues<InteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(qs.stringify(parameters)),
        cookies: {},
        headers: {},
        method,
        url: addParametersToUrl('https://provider.example.com/oidc/interaction', parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login', client_id: 'client_id' };
    });

    it.each(invalidHttpRequestMethods)(
      'should throw when the requested Http Request Method is invalid.',
      async (method) => {
        const request = new HttpRequest({
          body: Buffer.from(qs.stringify(parameters)),
          cookies: {},
          headers: {},
          method,
          url: addParametersToUrl('https://provider.example.com/oidc/interaction', parameters),
        });

        const error = new MethodNotAllowedError(
          `The Interaction Endpoint does not support the Http Request Method "${method}".`,
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(MethodNotAllowedError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          `[CustomInteractionValidator] The Interaction Endpoint does not support the Http Request Method "${method}"`,
          '817c032b-b400-43cd-8c7a-666ab335236c',
          { request },
          error,
        );
      },
    );

    it.each([HttpRequestMethod.GET, HttpRequestMethod.POST])(
      'should return an Interaction Context.',
      async (method) => {
        const request = requestFactory(method);
        await expect(validator.validate(request)).resolves.toBeEmptyObject();
      },
    );
  });
});
