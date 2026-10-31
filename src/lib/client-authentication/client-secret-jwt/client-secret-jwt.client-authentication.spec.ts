import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { DigitalSignatureAlgorithm, RsaJsonWebKey } from '@guarani/jose';
import { removeNullishValues } from '@guarani/primitives';

import { JwtBearerClientAssertionParameters } from '../../client-assertions/jwt-bearer/jwt-bearer.client-assertion.parameters';
import { CONTAINER } from '../../constants';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { ClientSecretJwtClientAuthentication } from './client-secret-jwt.client-authentication';

jest.mock('../../loggers/logger');

describe('Client Secret JWT Client Authentication', () => {
  let clientAuthentication: ClientSecretJwtClientAuthentication;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
      getClientAssertionUnwrapJsonWebKey: jest.fn(),
    }),
  );

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
      clientAuthenticationSigningAlgorithms: ['ES256', 'HS256', 'RS256'],
      clientAuthenticationEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
      clientAuthenticationEncryptionContentEncryptionAlgorithms: ['A128GCM'],
    }),
  );

  const unwrapJsonWebKey = new RsaJsonWebKey({
    kty: 'RSA',
    n:
      'zyfamCy0FswfsGY03GgYFecW92-hNP5P1hgoO53Dnl-sYhFzW-f_F5auPgOTZJkt' +
      'bp7BP12v7mILVioxHpNg259f0WozVmBkx3FKD_j1D32hgvMzt2c8tj5sxmVk1SYU' +
      '2-6y08uheOcHXfZHkYaZu5iVQCJzXnfUU7-4PyHvQwOx29uYWq6KvtwH-CHj0J2x' +
      'SRcBVM12WXzFJkwEriodrnQoE3ykNaCnFShqtLjMiFuPiP-ckd378vGEY4rZaU7-' +
      'dNF2pVyswFnPxYbV0ul9eRqg9ajiR7iYaFYyMru41W1xsGarLxdNRIu42r86E2hP' +
      'qkYR6wTFRIYeuzhwv0Xtlw',
    e: 'AQAB',
    d:
      'XI15UDD02xSi-dyINIs7a5m-PJm-xB71S3mqjAwuCJXFPmF-kWrjIUZcne9aDIGV' +
      'd01tmKKChnZ-iyY5oOgGx8j6deVFf4t8q1D13pID50JhhVCkZAY3bVMRpUhK1yJ3' +
      'AlYwxoi9oXdS5suwaRfimpqO4EMkGWpfTnWjW22NaPoxGDqE9g0KnQlViYGIknBT' +
      '1fHsPGQe_KYqk5mqHDu9SjNf4iVTtM_h6edOGpiwjh5pEkTbZ2MXmSwxZFLbjET5' +
      'Aehlsd09q0k9YAgJS9j9aeOht6ryxUdqkQHK_1RKl2QACELxe4b-7xjn_q7qXZiQ' +
      'wE7uim6LTnZGYKWRGmEXGQ',
    p:
      '8dZanZEFWKGFhlP2nI7I2PmzLSw-WUCshqzRDnGZoglamMH_JKoFg8L_36TYlpZp' +
      '9n6lLwtWIQ1JiAl_tQs-2q1FDKU38yo3vYCXNz7CQFmXv-X6ghhE-szwJCTRyUif' +
      'IAMb1FYw9LbZyFqYY4cD07bE7inJy90u8tYW9aNTTOk',
    q:
      '20mMvMKAF-gentFxtQIu4NCPuvDZiijMeUyzaehaWbJAlWUAuBktNKSJne0KgzM5' +
      'SxTslneJVBGUHd4yS1-REPhM52QC28sU5OvWMACcwFx69QBgAzgFw-yKG1ECdMvi' +
      '0nWWHm90bLkLW56J8tK_iioAobd48DS5-S6NABho1n8',
    dp:
      '2aJP1fDGYOaq5SH2kxmkAi9kYcipK2UaXfB0Co2M9td4InSjCfnAEL2Ry0_sYkhm' +
      'f5-lQ9rt3by5aaUyuliubdj0hNbCrSBXHUD11I-z_HkkKVvrvtvcZ9-6VKyV5pBm' +
      'M0bY6pPOZsuO3dE5xoegmAyo2LPemIoqT_r-mnwq4NE',
    dq:
      'M5XcxrbWnUkcku3gWt11m6tUdHyeIDMyzsItXperUXhuWvaUsboyeTTPrtgJZg3R' +
      'x4jXkxnxs1YjStdva23C2YQfyzsqtPvUIXodO9OZDGN1BVeePoOaT5nAb2aiNkmU' +
      'RUAmHWjIsZ7iPh5Qg0_ygRUaavCXQaKVsTmzL7eOSg8',
    qi:
      'Rph0Jz5hK97-Ow-BNBdAW9kJbYDm8FZxwpVy3w7fd4N-IPvwObKUM1OU46Gk2Rh0' +
      'mgzSOfTsh-piki3WeCL1XDjL_1VZGQWSGcNdWc6QeqEwQBA4wU4u3Oh1HSgB_ZAa' +
      'dKAIX12ZOURDRKtzNVTsv0kCBVLIgx7Y_6F923Iv8tg',
    alg: 'RSA-OAEP',
    kid: 'rsa-keyunwrap-key',
    use: 'enc',
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(ClientSecretJwtClientAuthentication).toSelf().asSingleton();

    clientAuthentication = container.resolve(ClientSecretJwtClientAuthentication);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "client_secret_jwt" as its value.', () => {
      expect(clientAuthentication.name).toBe<ClientAuthenticationName>('client_secret_jwt');
    });
  });

  describe('algorithms', () => {
    it('should have ["HS256", "HS384", "HS512"] as its value.', () => {
      expect(clientAuthentication['algorithms']).toStrictEqual<Exclude<DigitalSignatureAlgorithm, 'none'>[]>([
        'HS256',
        'HS384',
        'HS512',
      ]);
    });
  });

  describe('getClient()', () => {
    let parameters: JwtBearerClientAssertionParameters;

    const signedClientAssertion =
      'eyJhbGciOiJIUzI1NiJ9.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJjbGllbnRfaWQiLCJhdWQiOiJodHRw' +
      'czovL3Byb3ZpZGVyLmV4YW1wbGUuY29tL29pZGMvdG9rZW4iLCJleHAiOjE3ODY0' +
      'OTMxMDAsImlhdCI6MTc4NjQ5MjgwMCwibmJmIjoxNzg2NDkyODAwLCJqdGkiOiIx' +
      'ODg0NzkzYy0xNDUxLTRhMzAtOWIxMS1kNGQ2NWI2ZTZhY2QifQ.' +
      'yop-5Yieyny8awBSSBKqkLwgNY62OflKP42wYXpegco';

    const nestedClientAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'EdNqE0-Fgm--hzBUQGI8ddru6rhxJdnRqaWFAP0zke-QBBqds2ZEZs5HcfMWTjZS' +
      '48-UPO4aspfA3ifX48Glywz9qGMb_0drccCPfmPW8UvjprXY9PyUFYb5boRorKbh' +
      'aej7RSlBomHQzG7iVzVuaX8SmlXs_AyocNK70EAllZwHjgCI2hyo3Yc2CZbUlaXM' +
      'R12e87r5Iw0Fjxnr0se4GZtqwDXhzqTb9qhWNzlBVRd5xaVYPZNQV2BjHaiBmXs5' +
      'Qcl9Cbs2D4p_bU_o1Ex07OJ_WXyec9_UrBcTRxg1S42Mvw0_ilnlcwPTfcF7usMe' +
      'WmXlLxeHcKAvyQQpssoKjA.' +
      '8nM9ZPTsWqZ7us2A.' +
      'jOkq476VAotMPa5ZQPoiYBhPyG9lEKh5HRLCpKaH1ZojFXAdQxngGIIaKDhs42su' +
      'vmryFoJHT7X8CI12x-qi-eTalJx8dMZMO8gkKv5km6MHf29K_j3eQIrXujmleCIc' +
      'ApQXNyItrPjoHLO806fXO-lGl8-kViFoDcLiWTaAm31ZQ0gF18pUT5Atll6BfVAf' +
      'lEDfTOSh2IwzXKh8yGYem9ysQ4tRsa8gCIjcaZM4x32d-H1w6GIDbsSRDMWCh62Z' +
      '_e4A5dlJsv0r7sP9XZ9BFayjGfmxXYYhxVhjaylCM_v639d3p3Ew5EQZAYPLP72Q' +
      'nURbuxqnyfjZQLaVGWoTqw01U6FondBOH1tshXWl5vWqPMKx1WY2fcQ_rjEjeYh8' +
      '5Xq-W8wNnAGwZNh2oZxIJwq0eg.' +
      'hnPAaP3knxKot9HktRl9CA';

    const requestFactory = (data: Partial<JwtBearerClientAssertionParameters> = {}): HttpRequest => {
      removeNullishValues<JwtBearerClientAssertionParameters>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: new URL('https://provider.example.com/oidc/token'),
      });
    };

    beforeEach(() => {
      parameters = {
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: signedClientAssertion,
      };
    });

    it.each([signedClientAssertion, nestedClientAssertion])(
      'should throw when the Client Secret is expired.',
      async (clientAssertion) => {
        const request = requestFactory({ client_assertion: clientAssertion });

        const clientSecret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
          secret: 'dZD9jxWOFEiSi-9AjOwmvJKaEJRUBbXl',
          expiresAt: new Date(Date.now() - 7776000000),
        });

        const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
          id: 'client_id',
          secrets: [clientSecret],
          authenticationMethod: 'client_secret_jwt',
          authenticationSigningAlgorithm: 'HS256',
        });

        dataAccessMock.getClientAssertionUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findClientById.mockResolvedValueOnce(client);

        const error = new InvalidClientError('The Client Secret is expired.');
        await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
          InvalidClientError,
          error.description,
        );

        expect(loggerMock.error).not.toHaveBeenCalled();
      },
    );

    it.each([signedClientAssertion, nestedClientAssertion])(
      'should return the Client of the Client Assertion.',
      async (clientAssertion) => {
        const request = requestFactory({ client_assertion: clientAssertion });

        const clientSecret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
          secret: 'dZD9jxWOFEiSi-9AjOwmvJKaEJRUBbXl',
          expiresAt: new Date(Date.now() + 7776000000),
        });

        const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
          id: 'client_id',
          secrets: [clientSecret],
          authenticationMethod: 'client_secret_jwt',
          authenticationSigningAlgorithm: 'HS256',
        });

        dataAccessMock.getClientAssertionUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findClientById.mockResolvedValueOnce(client);

        await expect(clientAuthentication.getClient(request)).resolves.toBe(client);
      },
    );
  });
});
