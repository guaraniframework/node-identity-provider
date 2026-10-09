import { Buffer } from 'buffer';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ErrorRequestContext } from '../../context/error-request.context';
import { IdentityProviderError } from '../../errors/identity-provider.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { MethodNotAllowedError } from '../../errors/method-not-allowed/method-not-allowed.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.type';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { ErrorRequest } from '../../requests/error-request';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ErrorRequestValidator } from './error-request.validator';

jest.mock('../../logger/logger');

const invalidHttpRequestMethods: HttpRequestMethod[] = ['delete', 'post', 'put'];
const invalidErrorCodes: any[] = [undefined, ''];
const invalidErrorDescriptions: any[] = [undefined, ''];

describe('Error Request Validator', () => {
  let validator: ErrorRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ErrorRequestValidator).toSelf().asSingleton();

    validator = container.resolve(ErrorRequestValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('validate()', () => {
    let parameters: ErrorRequest;

    const requestFactory = (data: Partial<ErrorRequest> = {}): HttpRequest => {
      removeNullishValues<ErrorRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'get',
        url: addParametersToUrl('https://provider.example.com/oidc/error', parameters),
      });
    };

    beforeEach(() => {
      parameters = { error: 'custom_error', error_description: 'Custom Error Description.' };
    });

    it.each(invalidHttpRequestMethods)(
      'should throw when the requested Http Request Method is invalid.',
      async (method) => {
        const request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method,
          url: addParametersToUrl('https://provider.example.com/oidc/error', parameters),
        });

        const error = new MethodNotAllowedError(
          `The Error Endpoint does not support the Http Request Method "${method.toUpperCase()}".`,
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(MethodNotAllowedError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          `[ErrorRequestValidator] The Error Endpoint does not support the Http Request Method "${method.toUpperCase()}"`,
          '817c032b-b400-43cd-8c7a-666ab335236c',
          { request },
          error,
        );
      },
    );

    it.each(invalidErrorCodes)('should throw when the provided parameter "error" is invalid.', async (errorCode) => {
      const request = requestFactory({ error: errorCode });

      const error = new InvalidRequestError('Invalid parameter "error".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ErrorRequestValidator] Invalid parameter "error"',
        '99fc31ae-66a3-4b4d-b9ab-94f83dab7cd0',
        { parameters },
        error,
      );
    });

    it.each(invalidErrorDescriptions)(
      'should throw when the provided parameter "error_description" is invalid.',
      async (errorDescription) => {
        const request = requestFactory({ error_description: errorDescription });

        const error = new InvalidRequestError('Invalid parameter "error_description".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ErrorRequestValidator] Invalid parameter "error_description"',
          '5c310aca-6ee8-4e7c-a4c9-becd08093c63',
          { parameters },
          error,
        );
      },
    );

    it('should throw when the provided parameter "error_uri" is invalid.', async () => {
      const request = requestFactory({ error_uri: '' });

      const error = new InvalidRequestError('Invalid parameter "error_uri".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ErrorRequestValidator] Invalid parameter "error_uri"',
        'a49246fd-c157-43a0-bf01-b4e46079f5ce',
        { parameters },
        error,
      );
    });

    it('should return an Error Request Context.', async () => {
      const request = requestFactory();

      const error = new IdentityProviderError('custom_error', 'Custom Error Description.');
      await expect(validator.validate(request)).resolves.toMatchObject<ErrorRequestContext>({ parameters, error });
    });

    it('should return an Error Request Context with an Error Page URI.', async () => {
      const request = requestFactory({ error_uri: 'https://provider.example.com/docs/identity_provider_error' });

      const error = new IdentityProviderError('custom_error', 'Custom Error Description.').setUri(
        'https://provider.example.com/docs/identity_provider_error',
      );

      await expect(validator.validate(request)).resolves.toMatchObject<ErrorRequestContext>({ parameters, error });
    });
  });
});
