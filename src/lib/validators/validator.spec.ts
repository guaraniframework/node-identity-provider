import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer, Injectable } from '@guarani/di';

import { CONTAINER } from '../constants';
import { EndpointName } from '../endpoints/endpoint-name.type';
import { MethodNotAllowedError } from '../errors/method-not-allowed/method-not-allowed.error';
import { HttpRequest } from '../http/request/http-request';
import { HttpRequestMethod } from '../http/request/http-request-method.enum';
import { Logger } from '../loggers/logger';
import { Validator } from './validator';

jest.mock('../loggers/logger');

@Injectable()
class CustomFlowValidator extends Validator<NodeJS.Dict<any>> {
  public readonly endpoint: EndpointName = 'custom_flow' as EndpointName;
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.GET];
  public constructor(logger: Logger) {
    super(logger);
  }
  public async validate(_request: HttpRequest): Promise<NodeJS.Dict<any>> {
    throw new Error('Method not implemented.');
  }
}

describe('Request Validator', () => {
  let validator: CustomFlowValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(CustomFlowValidator).toSelf().asSingleton();

    validator = container.resolve(CustomFlowValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('checkHttpRequestMethod()', () => {
    it('should throw when the Endpoint does not support the provided Http Request Method.', () => {
      const request = new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.DELETE,
        url: new URL('https://provider.example.com/oidc/custom_flow'),
      });

      const error = new MethodNotAllowedError(
        'The Custom Flow Endpoint does not support the Http Request Method "DELETE".',
      );

      expect(() => validator['checkHttpRequestMethod'](request)).toThrowWithMessage(
        MethodNotAllowedError,
        error.description,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomFlowValidator] The Custom Flow Endpoint does not support the Http Request Method "DELETE"',
        '817c032b-b400-43cd-8c7a-666ab335236c',
        { request },
        error,
      );
    });

    it('should not throw when the Endpoint supports the provided Http Request Method.', () => {
      const request = new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: new URL('https://provider.example.com/oidc/custom_flow'),
      });

      expect(() => validator['checkHttpRequestMethod'](request)).not.toThrow();
    });
  });
});
