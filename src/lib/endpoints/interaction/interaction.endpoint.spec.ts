import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify, removeNullishValues } from '@guarani/primitives';

import { ContextInteractionContext } from '../../context/interaction/context/context.interaction-context';
import { DecisionInteractionContext } from '../../context/interaction/decision/decision.interaction-context';
import { Client } from '../../entities/client';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { ServerErrorError } from '../../errors/server-error/server-error.error';
import { UnsupportedInteractionTypeError } from '../../errors/unsupported-interaction-type/unsupported-interaction-type.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.type';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ContextInteractionRequest } from '../../requests/interaction/context/context.interaction-request';
import { DecisionInteractionRequest } from '../../requests/interaction/decision/decision.interaction-request';
import { ContextInteractionResponse } from '../../responses/interaction/context/context.interaction-response';
import { DecisionInteractionResponse } from '../../responses/interaction/decision/decision.interaction-response';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionRequestValidator } from '../../validators/interaction/context/context.interaction-request.validator';
import { DecisionInteractionRequestValidator } from '../../validators/interaction/decision/decision.interaction-request.validator';
import { EndpointName } from '../endpoint-name.type';
import { InteractionEndpoint } from './interaction.endpoint';

jest.mock('../../logger/logger');

const invalidInteractionTypes: any[] = [undefined, ''];

describe('Interaction Endpoint', () => {
  let endpoint: InteractionEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const contextInteractionRequestValidatorMock = jest.mocked<ContextInteractionRequestValidator>(
    Object.assign<ContextInteractionRequestValidator, Partial<ContextInteractionRequestValidator>>(
      Reflect.construct(ContextInteractionRequestValidator, []),
      { name: 'login', validate: jest.fn() },
    ),
  );

  const decisionInteractionRequestValidatorMock = jest.mocked<DecisionInteractionRequestValidator>(
    Object.assign<DecisionInteractionRequestValidator, Partial<DecisionInteractionRequestValidator>>(
      Reflect.construct(DecisionInteractionRequestValidator, []),
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
    container.bind(ContextInteractionRequestValidator).toValue(contextInteractionRequestValidatorMock);
    container.bind(DecisionInteractionRequestValidator).toValue(decisionInteractionRequestValidatorMock);
    container.bind(InteractionEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(InteractionEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "interaction" as its value.', () => {
      expect(endpoint.name).toEqual<EndpointName>('interaction');
    });
  });

  describe('path', () => {
    it('should have "/oidc/interaction" as its Path.', () => {
      expect(endpoint.path).toEqual('/oidc/interaction');
    });
  });

  describe('httpMethods', () => {
    it('should have \'["GET", "POST"]\' as its supported Http Request Methods.', () => {
      expect(endpoint.httpMethods).toStrictEqual<HttpRequestMethod[]>(['GET', 'POST']);
    });
  });

  describe('handle()', () => {
    let contextParameters: ContextInteractionRequest;
    let decisionParameters: DecisionInteractionRequest;

    const contextRequestFactory = (data: Partial<ContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues(Object.assign(contextParameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), contextParameters),
      });
    };

    const decisionRequestFactory = (data: Partial<DecisionInteractionRequest> = {}): HttpRequest => {
      removeNullishValues(Object.assign(decisionParameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(decisionParameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      contextParameters = { interaction_type: 'login', client_id: 'client_id' };
      decisionParameters = { interaction_type: 'login' };
    });

    it('should return an Error Response when the provided Http Request Method is unsupported.', async () => {
      const request = contextRequestFactory();
      Reflect.set(request, 'method', 'PUT');

      const cause = new TypeError('Unsupported Http Method "PUT" for Interaction Endpoint.');
      const error = new ServerErrorError('An unexpected error occurred.', { cause });

      const response = await endpoint.handle(request);

      expect(response.status).toEqual(error.status);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));
    });

    // #region Context Interaction
    it.each(invalidInteractionTypes)(
      'should return a Context Error Response when the provided parameter "interaction_type" is invalid.',
      async (interactionType) => {
        const request = contextRequestFactory({ interaction_type: interactionType });

        const error = new InvalidRequestError('Invalid parameter "interaction_type".');
        const response = await endpoint.handle(request);

        expect(response.status).toEqual(error.status);

        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
          ...error.headers,
        });

        expect(response.body).toEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[InteractionEndpoint] Invalid parameter "interaction_type"',
          'e86743b6-fb58-489f-b489-e8eedaeb2fd4',
          { parameters: contextParameters },
          error,
        );
      },
    );

    it('should return a Context Error Response when the provided parameter "interaction_type" is unsupported.', async () => {
      const request = contextRequestFactory({ interaction_type: 'unknown' as InteractionTypeName });

      const error = new UnsupportedInteractionTypeError('Unsupported interaction_type "unknown".');
      const response = await endpoint.handle(request);

      expect(response.status).toEqual(error.status);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[InteractionEndpoint] Unsupported interaction_type "unknown"',
        '09e45b3f-5508-4cc9-a5c7-fe1c7734962c',
        { parameters: contextParameters },
        error,
      );
    });

    it('should return a Context Interaction Response.', async () => {
      const request = contextRequestFactory();

      const contextInteractionContext: ContextInteractionContext = {
        parameters: contextParameters,
        client,
        interactionType: interactionTypeMock,
      };

      const contextInteractionResponse: ContextInteractionResponse = {
        request_url: 'https://idp.example.com/oidc/authorization?response_type=code',
        context: {},
      };

      contextInteractionRequestValidatorMock.validate.mockResolvedValueOnce(contextInteractionContext);
      interactionTypeMock.handleContext.mockResolvedValueOnce(contextInteractionResponse);

      const response = await endpoint.handle(request);

      expect(response.status).toEqual(200);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toEqual(Buffer.from(jsonStringify(contextInteractionResponse), 'utf8'));

      expect(interactionTypeMock.handleContext).toHaveBeenCalledExactlyOnceWith(contextInteractionContext);
      expect(interactionTypeMock.handleDecision).not.toHaveBeenCalled();
    });
    // #endregion

    // #region Decision Interaction
    it.each(invalidInteractionTypes)(
      'should return a Decision Error Response when the provided parameter "interaction_type" is invalid.',
      async (interactionType) => {
        const request = decisionRequestFactory({ interaction_type: interactionType });

        const error = new InvalidRequestError('Invalid parameter "interaction_type".');
        const response = await endpoint.handle(request);

        expect(response.status).toEqual(error.status);

        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          'cache-control': 'no-store',
          pragma: 'no-cache',
          'content-type': 'application/json',
          ...error.headers,
        });

        expect(response.body).toEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[InteractionEndpoint] Invalid parameter "interaction_type"',
          'a65757af-c109-44f6-857e-2d05c9d51972',
          { parameters: decisionParameters },
          error,
        );
      },
    );

    it('should return a Decision Error Response when the provided parameter "interaction_type" is unsupported.', async () => {
      const request = decisionRequestFactory({ interaction_type: 'unknown' as InteractionTypeName });

      const error = new UnsupportedInteractionTypeError('Unsupported interaction_type "unknown".');
      const response = await endpoint.handle(request);

      expect(response.status).toEqual(error.status);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
        ...error.headers,
      });

      expect(response.body).toEqual(Buffer.from(jsonStringify(error.toJSON()), 'utf8'));

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[InteractionEndpoint] Unsupported interaction_type "unknown"',
        '51403e7c-c28b-427f-a95f-d2a3708d6622',
        { parameters: decisionParameters },
        error,
      );
    });

    it('should return a Decision Interaction Response.', async () => {
      const request = decisionRequestFactory();

      const decisionInteractionContext: DecisionInteractionContext = {
        parameters: decisionParameters,
        client,
        interactionType: interactionTypeMock,
      };

      const decisionInteractionResponse: DecisionInteractionResponse = {
        redirect_to: 'https://idp.example.com/oidc/authorization?response_type=code',
      };

      decisionInteractionRequestValidatorMock.validate.mockResolvedValueOnce(decisionInteractionContext);
      interactionTypeMock.handleDecision.mockResolvedValueOnce(decisionInteractionResponse);

      const response = await endpoint.handle(request);

      expect(response.status).toEqual(200);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-type': 'application/json',
      });

      expect(response.body).toEqual(Buffer.from(jsonStringify(decisionInteractionResponse), 'utf8'));

      expect(interactionTypeMock.handleContext).not.toHaveBeenCalled();
      expect(interactionTypeMock.handleDecision).toHaveBeenCalledExactlyOnceWith(decisionInteractionContext);
    });
    // #endregion
  });
});
