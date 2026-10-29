import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify, removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { ContextInteractionContext } from '../../context/interaction/context/context-interaction-context';
import { DecisionInteractionContext } from '../../context/interaction/decision/decision-interaction-context';
import { Client } from '../../entities/client';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedInteractionTypeError } from '../../errors/unsupported-interaction-type/unsupported-interaction-type.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { ContextInteractionRequest } from '../../requests/interaction/context/context-interaction-request';
import { DecisionInteractionRequest } from '../../requests/interaction/decision/decision-interaction-request';
import { ContextInteractionResponse } from '../../responses/interaction/context/context-interaction-response';
import { DecisionInteractionResponse } from '../../responses/interaction/decision/decision-interaction-response';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionValidator } from '../../validators/interaction/context/context-interaction.validator';
import { DecisionInteractionValidator } from '../../validators/interaction/decision/decision-interaction.validator';
import { EndpointName } from '../endpoint-name.type';
import { InteractionEndpoint } from './interaction.endpoint';

jest.mock('../../loggers/logger');

const invalidInteractionTypes: any[] = [undefined, ''];

describe('Interaction Endpoint', () => {
  let endpoint: InteractionEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const contextInteractionValidatorMock = jest.mocked<ContextInteractionValidator>(
    Object.assign<ContextInteractionValidator, Partial<ContextInteractionValidator>>(
      Reflect.construct(ContextInteractionValidator, []),
      { name: 'login', validate: jest.fn() },
    ),
  );

  const decisionInteractionValidatorMock = jest.mocked<DecisionInteractionValidator>(
    Object.assign<DecisionInteractionValidator, Partial<DecisionInteractionValidator>>(
      Reflect.construct(DecisionInteractionValidator, []),
      { name: 'login', validate: jest.fn() },
    ),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      handleContext: jest.fn(),
      handleDecision: jest.fn(),
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ContextInteractionValidator).toValue(contextInteractionValidatorMock);
    container.bind(DecisionInteractionValidator).toValue(decisionInteractionValidatorMock);
    container.bind(InteractionEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(InteractionEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "interaction" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('interaction');
    });
  });

  describe('path', () => {
    it('should have "/oidc/interaction" as its value.', () => {
      expect(endpoint.path).toBe('/oidc/interaction');
    });
  });

  describe('routes', () => {
    it('should have a GET and a POST route as its value.', () => {
      expect(endpoint.routes).toStrictEqual<HttpRoute[]>([
        { method: HttpRequestMethod.GET, handler: endpoint.handleContext },
        { method: HttpRequestMethod.POST, handler: endpoint.handleDecision },
      ]);
    });
  });

  describe('handleContext()', () => {
    let parameters: ContextInteractionRequest;

    const requestFactory = (data: Partial<ContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: addParametersToUrl(new URL('https://provider.example.com/oidc/interaction'), parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login', client_id: 'client_id' };
    });

    it.each(invalidInteractionTypes)(
      'should return a Context Error Response when the provided parameter "interaction_type" is invalid.',
      async (interactionType) => {
        const request = requestFactory({ interaction_type: interactionType });

        const error = new InvalidRequestError('Invalid parameter "interaction_type".');
        const response = await endpoint.handleContext(request);

        expect(response.status).toBe(error.status);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
          ...error.headers,
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[InteractionEndpoint] Invalid parameter "interaction_type"',
          'e86743b6-fb58-489f-b489-e8eedaeb2fd4',
          { parameters },
          error,
        );
      },
    );

    it('should return a Context Error Response when the provided parameter "interaction_type" is unsupported.', async () => {
      const request = requestFactory({ interaction_type: 'unknown' as InteractionTypeName });

      const error = new UnsupportedInteractionTypeError('Unsupported Interaction Type "unknown".');
      const response = await endpoint.handleContext(request);

      expect(response.status).toBe(error.status);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[InteractionEndpoint] Unsupported Interaction Type "unknown"',
        '09e45b3f-5508-4cc9-a5c7-fe1c7734962c',
        { parameters },
        error,
      );
    });

    it('should return a Context Interaction Response.', async () => {
      const request = requestFactory();

      const contextInteractionContext: ContextInteractionContext = {
        parameters,
        client,
        interactionType: interactionTypeMock,
      };

      const contextInteractionResponse: ContextInteractionResponse = {
        request_url: 'https://provider.example.com/oidc/authorization?response_type=code',
        context: {},
      };

      contextInteractionValidatorMock.validate.mockResolvedValueOnce(contextInteractionContext);
      interactionTypeMock.handleContext.mockResolvedValueOnce(contextInteractionResponse);

      const response = await endpoint.handleContext(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(contextInteractionResponse), 'utf8'));

      expect(interactionTypeMock.handleContext).toHaveBeenCalledExactlyOnceWith(contextInteractionContext);
      expect(interactionTypeMock.handleDecision).not.toHaveBeenCalled();
    });
  });

  describe('handleDecision()', () => {
    let parameters: DecisionInteractionRequest;

    const requestFactory = (data: Partial<DecisionInteractionRequest> = {}): HttpRequest => {
      removeNullishValues(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'login' };
    });

    it.each(invalidInteractionTypes)(
      'should return a Decision Error Response when the provided parameter "interaction_type" is invalid.',
      async (interactionType) => {
        const request = requestFactory({ interaction_type: interactionType });

        const error = new InvalidRequestError('Invalid parameter "interaction_type".');
        const response = await endpoint.handleDecision(request);

        expect(response.status).toBe(error.status);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
          ...error.headers,
        });

        expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[InteractionEndpoint] Invalid parameter "interaction_type"',
          'a65757af-c109-44f6-857e-2d05c9d51972',
          { parameters },
          error,
        );
      },
    );

    it('should return a Decision Error Response when the provided parameter "interaction_type" is unsupported.', async () => {
      const request = requestFactory({ interaction_type: 'unknown' as InteractionTypeName });

      const error = new UnsupportedInteractionTypeError('Unsupported Interaction Type "unknown".');
      const response = await endpoint.handleDecision(request);

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[InteractionEndpoint] Unsupported Interaction Type "unknown"',
        '51403e7c-c28b-427f-a95f-d2a3708d6622',
        { parameters },
        error,
      );
    });

    it('should return a Decision Interaction Response.', async () => {
      const request = requestFactory();

      const decisionInteractionContext: DecisionInteractionContext = {
        parameters,
        client,
        interactionType: interactionTypeMock,
      };

      const decisionInteractionResponse: DecisionInteractionResponse = {
        redirect_to: 'https://provider.example.com/oidc/authorization?response_type=code',
      };

      decisionInteractionValidatorMock.validate.mockResolvedValueOnce(decisionInteractionContext);
      interactionTypeMock.handleDecision.mockResolvedValueOnce(decisionInteractionResponse);

      const response = await endpoint.handleDecision(request);

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(decisionInteractionResponse), 'utf8'));

      expect(interactionTypeMock.handleDecision).toHaveBeenCalledExactlyOnceWith(decisionInteractionContext);
    });
    // #endregion
  });
});
