import { Buffer } from 'buffer';

import { getContainer } from '@guarani/di';

import { ErrorRequestContext } from '../../context/error-request.context';
import { IdentityProviderError } from '../../errors/identity-provider.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorRequest } from '../../requests/error-request';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ErrorRequestValidator } from '../../validators/error/error-request.validator';
import { ErrorEndpoint } from './error.endpoint';

jest.mock('../../logger/logger');
jest.mock('../../validators/error/error-request.validator');

describe('Error Endpoint', () => {
  let endpoint: ErrorEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const validatorMock = jest.mocked(ErrorRequestValidator.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ErrorRequestValidator).toValue(validatorMock);
    container.bind(ErrorEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(ErrorEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('getErrorResponse()', () => {
    it('should return an Error Response.', async () => {
      const parameters: ErrorRequest = { error: 'custom_error', error_description: 'Custom Error Description.' };

      const request = new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'get',
        url: addParametersToUrl('https://provider.example.com/oidc/error', parameters),
      });

      const error = new IdentityProviderError('custom_error', 'Custom Error Description.');
      const context: ErrorRequestContext = { parameters, error };

      validatorMock.validate.mockResolvedValueOnce(context);

      await expect(endpoint.getErrorResponse(request)).resolves.toStrictEqual(error.toJSON());
    });
  });
});
