import { OutgoingHttpHeaders } from 'http';

import { getContainer } from '@guarani/di';

import { ErrorEndpoint } from '../endpoints/error/error.endpoint';
import { IdentityProviderError } from '../errors/identity-provider.error';
import { InvalidRequestError } from '../errors/invalid-request/invalid-request.error';
import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/tokens';
import { ErrorRequest } from '../requests/error-request';
import { TemplateEngine } from '../template-engine/template-engine';
import { addParametersToUrl } from '../utils/add-parameters-to-url/add-parameters-to-url';
import { sanitizeHtml } from '../utils/sanitize-html/sanitize-html';
import { HttpRequest } from './request/http-request';
import { HttpResponse } from './response/http-response';
import { IdentityProvider } from './identity-provider';

jest.mock('../logger/logger');
jest.mock('../endpoints/error/error.endpoint');

describe('Identity Provider', () => {
  let provider: IdentityProvider;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const templateEngineMock = jest.mocked<TemplateEngine>(
    Object.assign<TemplateEngine, Partial<TemplateEngine>>(Reflect.construct(TemplateEngine, []), {
      render: jest.fn(),
    }),
  );

  const errorEndpointMock = jest.mocked(ErrorEndpoint.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(TemplateEngine).toValue(templateEngineMock);
    container.bind(ErrorEndpoint).toValue(errorEndpointMock);
    container.bind(IdentityProvider).toSelf().asSingleton();

    provider = container.resolve(IdentityProvider);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('error()', () => {
    let response: HttpResponse;

    const requestFactory = (parameters: ErrorRequest): HttpRequest => {
      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'get',
        url: addParametersToUrl('https://provider.example.com/oidc/error', parameters),
      });
    };

    beforeEach(() => {
      response = new HttpResponse();

      templateEngineMock.render.mockImplementationOnce(async (_, error) => {
        return `<body>${sanitizeHtml(error['error'] as string)} - ${sanitizeHtml(error['error_description'] as string)}</body>`;
      });
    });

    it('should return an Error Response with the raised Identity Provider Error as the Html Body.', async () => {
      const parameters: ErrorRequest = { error: '', error_description: '' };
      const request = requestFactory(parameters);

      const error = new InvalidRequestError('Invalid parameter "error".');
      const errorResponse = error.toJSON();

      errorEndpointMock.getErrorResponse.mockRejectedValueOnce(error);

      await expect(provider.error(request, response)).resolves.not.toThrow();

      expect(response.status).toEqual(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        ...error.headers,
        'content-type': 'text/html; charset=UTF-8',
      });

      expect(response.cookies).toBeEmptyObject();
      expect(response.body).toEqual(
        Buffer.from('<body>invalid_request - Invalid parameter &quot;error&quot;.</body>', 'utf8'),
      );

      expect(templateEngineMock.render).toHaveBeenCalledExactlyOnceWith('error', errorResponse);
    });

    it('should return an Error Response with the provided Error Response Parameters as the Html Body.', async () => {
      const parameters: ErrorRequest = { error: 'custom_error', error_description: 'Custom Error Description.' };
      const request = requestFactory(parameters);

      const error = new IdentityProviderError('custom_error', 'Custom Error Description.');
      const errorResponse = error.toJSON();

      errorEndpointMock.getErrorResponse.mockResolvedValueOnce(errorResponse);

      await expect(provider.error(request, response)).resolves.not.toThrow();

      expect(response.status).toEqual(200);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'text/html; charset=UTF-8' });
      expect(response.cookies).toBeEmptyObject();
      expect(response.body).toEqual(Buffer.from('<body>custom_error - Custom Error Description.</body>', 'utf8'));

      expect(templateEngineMock.render).toHaveBeenCalledExactlyOnceWith('error', errorResponse);
    });
  });
});
