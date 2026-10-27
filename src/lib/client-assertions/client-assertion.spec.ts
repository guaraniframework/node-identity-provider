import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable } from '@guarani/di';

import { ClientAuthenticationName } from '../client-authentication/client-authentication-name.type';
import { CONTAINER } from '../constants';
import { Client } from '../entities/client';
import { HttpRequest } from '../http/request/http-request';
import { HttpRequestMethod } from '../http/request/http-request-method.enum';
import { Logger } from '../loggers/logger';
import { ClientAssertion } from './client-assertion';
import { ClientAssertionName } from './client-assertion-name.type';

jest.mock('../loggers/logger');

@Injectable()
class CustomClientAssertion extends ClientAssertion {
  public readonly name: ClientAuthenticationName = 'client_secret_jwt';
  public readonly clientAssertionType: ClientAssertionName = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
  public constructor(protected override readonly logger: Logger) {
    super(logger);
  }
  public override async getClient(_request: HttpRequest): Promise<Client> {
    throw new Error('Method not implemented.');
  }
}

describe('JWT Bearer Client Assertion', () => {
  let clientAssertion: CustomClientAssertion;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(CustomClientAssertion).toSelf().asSingleton();

    clientAssertion = container.resolve(CustomClientAssertion);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('hasBeenRequested()', () => {
    const methodRequests: [NodeJS.Dict<string>, boolean][] = [
      [{}, false],
      [{ client_assertion_type: '' }, false],
      [{ client_assertion_type: 'foo' }, false],
      [{ client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer' }, false],
      [{ client_assertion_type: '', client_assertion: 'foo' }, false],
      [{ client_assertion_type: 'foo', client_assertion: 'foo' }, false],
      [{ client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: '' }, true],
      [
        { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: 'a' },
        true,
      ],
      [
        { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: '.a' },
        true,
      ],
      [
        { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: '.a.b' },
        true,
      ],
      [
        { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: 'a.b' },
        true,
      ],
      [
        {
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'a.b.c.d',
        },
        true,
      ],
      [
        { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: 'a.b.c' },
        true,
      ],
    ];

    it.each(methodRequests)(
      'should check if the Client Authentication Method has beed requested.',
      (body, expected) => {
        const request = new HttpRequest({
          body: Buffer.from(stringifyQs(body), 'utf8'),
          cookies: {},
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: HttpRequestMethod.POST,
          url: new URL('https://provider.example.com/oidc/token'),
        });

        expect(clientAssertion.hasBeenRequested(request)).toBe(expected);
      },
    );
  });
});
