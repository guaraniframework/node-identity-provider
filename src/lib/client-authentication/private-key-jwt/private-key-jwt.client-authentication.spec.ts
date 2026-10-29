import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { DigitalSignatureAlgorithm, EllipticCurveJsonWebKey, RsaJsonWebKey } from '@guarani/jose';
import { removeNullishValues } from '@guarani/primitives';

import { JwtBearerClientAssertionParameters } from '../../client-assertions/jwt-bearer/jwt-bearer.client-assertion.parameters';
import { CONTAINER } from '../../constants';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { PrivateKeyJwtClientAuthentication } from './private-key-jwt.client-authentication';

jest.mock('../../loggers/logger');

describe('Private Key JWT Client Authentication', () => {
  let clientAuthentication: PrivateKeyJwtClientAuthentication;
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

  const clientSignJsonWebKey = new EllipticCurveJsonWebKey({
    kty: 'EC',
    crv: 'P-256',
    x: '4c_cS6IT6jaVQeobt_6BDCTmzBaBOTmmiSCpjd5a6Og',
    y: 'mnrPnCFTDkGdEwilabaqM7DzwlAFgetZTmP9ycHPxF8',
    d: 'bwVX6Vx-TOfGKYOPAcu2xhaj3JUzs-McsC-suaHnFBo',
    alg: 'ES256',
    kid: 'ec-sign-key',
    use: 'sig',
  });

  const rsaClientSignJsonWebKey = new RsaJsonWebKey({
    kty: 'RSA',
    n:
      'xjpFydzTbByzL5jhEa2yQO63dpS9d9SKaN107AR69skKiTR4uK1c4SzDt4YcurDB' +
      'yhgKNzeBo6Vq3IRrkrltp97LKWfeZdM-leGt8-UTZEWqrNf3UGOEj8kI6lbjiG-S' +
      'n_yNHcVA9qBV22norZkgXctHLeFbY6TmpD-I8_UiplZUHoc9KlYc7crCQRa-O7tK' +
      'FDULNTMjjifc0dmuYP7ZcYAZXmRmoOpQuDr8s7OZY7TAqN0btMfA7RpUCWLT6TMR' +
      'QPX8GcyTxfbkOrSTFueKMHVNdXDtl068XXJ9mkjORiEmwlzqSBoxdeLWcNf_u20S' +
      '5JG5iK0nsm1uZYu-02XN-w',
    e: 'AQAB',
    d:
      'cc2YrWia9LGRad0SMe0PrlmeeHSyRe5-u--QJcP4uF_5LYYzXIsjDJ9_iYh0S_YY' +
      'e6bLjqHOSp44OHvJqoXMX5j3-ECKnNjnUHMtRB2awXGBqBOhB8TqoQXgmXDi1jx_' +
      '6Fu8xH-vaSfpwrsN-0QzIcYHil6b8hwE0f0r6istBmL7iayJbnONp7na9ow2fUQl' +
      'nr41vsHZa4knTZ2E2kq5ntgaXlF6AIdc4DD_BZpf2alEbhQMX9T168ZsSyAs7wKS' +
      'd3ivhHRQayXEapUfZ_ykvnF4-DoVI1iRoowgZ-dlnv4Ff3YrKQ3Zv3uHJcF1BtWQ' +
      'VipOIHx4GyIc4bmTSA5PEQ',
    p:
      '-ZFuDg38cG-e5L6h1Jbn8ngifWgHx8m1gybkY7yEpU1V02fvQAMI1XG-1WpZm2xj' +
      'j218wNCj0BCEdmdBqZMk5RlzLagtfzQ3rPO-ucYPZ_SDmy8Udzr-sZLCqMFyLtxk' +
      'gMfGo4QZ6UJWYpTCCmZ92nS_pa4ePrQdlpnS4DLv_SM',
    q:
      'y1YdZtsbYfCOdsYBZrDpcvubwMN2fKRAzETYW5sqYv8XkxHG1J1zHH-zWJBQfZhT' +
      'biHPgHvoaFykEm9xhuA77RFGRXxFUrGBtfqIx_OG-kRWudmH83EyMzMoKQaW98RX' +
      'WqRO1JDlcs4_vzf_KN63zQKv5i4UdiiObQkZCYIOVUk',
    dp:
      'vqtDX-2DjgtZY_3Y-eiJMRBjmVgfiZ4r1RWjrCddWEVrauafPVKULy6F09s6tqnq' +
      'rqvBgjZk0ROtgCCHZB0NNRNqkdlJWUP1vWdDsf8FyjBfU_J2OlmSOOydV_zjVbX_' +
      '-vumYUsN2M5b3Vk1nmiLgplryhLq_JDzghnnqG6CN-0',
    dq:
      'tKczxBhSwbcpu5i70fLH1iJ5BNAkSyTbdSCNYQYAqKee2Elo76lbhixmuP6upIdb' +
      'SHO9mZd8qov0MXTV1lEOrNc2KbH5HTkb1wRZ1dwlReDFdKUxxjYBtb9zpM93_XVx' +
      'btSgPPbnBBL-S_OCPVtyzS_f-49hGoF52KHGns3v0hE',
    qi:
      'C4q9uIi-1fYhE0NTWVNzdhSi7fA3uznTWaW1X5LWBF4gBOcWvMMTfOZEaPjtY2WP' +
      'XaTWU4bdVN0GgktVLUDPLrSj533W1cOQZb_mm_7BFNrleelruT87bZhWPYQ979kl' +
      '6590ySgbH81pEM8FQW1JBATz0MYtUNZAt8N360vayE4',
    alg: 'RS256',
    kid: 'rsasignkey',
    use: 'sig',
  });

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

  const rsaClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'rsa_client_id',
    authenticationMethod: 'private_key_jwt',
    jwks: { keys: [rsaClientSignJsonWebKey.toJSON()] },
    authenticationSigningAlgorithm: 'RS256',
  });

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    authenticationMethod: 'private_key_jwt',
    jwks: { keys: [clientSignJsonWebKey.toJSON()] },
    authenticationSigningAlgorithm: 'ES256',
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(PrivateKeyJwtClientAuthentication).toSelf().asSingleton();

    clientAuthentication = container.resolve(PrivateKeyJwtClientAuthentication);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "private_key_jwt" as its value.', () => {
      expect(clientAuthentication.name).toBe<ClientAuthenticationName>('private_key_jwt');
    });
  });

  describe('algorithms', () => {
    it('should have ["ES256", "ES384", "ES512", "EdDSA", "PS256", "PS384", "PS512", "RS256", "RS384", "RS512"] as its value.', () => {
      expect(clientAuthentication['algorithms']).toStrictEqual<Exclude<DigitalSignatureAlgorithm, 'none'>[]>([
        'ES256',
        'ES384',
        'ES512',
        'EdDSA',
        'PS256',
        'PS384',
        'PS512',
        'RS256',
        'RS384',
        'RS512',
      ]);
    });
  });

  describe('getClient()', () => {
    let parameters: JwtBearerClientAssertionParameters;

    const rsaSignedClientAssertion =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InJzYS1zaWduLWtleSJ9.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJjbGllbnRfaWQiLCJhdWQiOiJodHRw' +
      'czovL3Byb3ZpZGVyLmV4YW1wbGUuY29tL29pZGMvdG9rZW4iLCJleHAiOjE3ODY0' +
      'OTMxMDAsImlhdCI6MTc4NjQ5MjgwMCwibmJmIjoxNzg2NDkyODAwLCJqdGkiOiIx' +
      'ODg0NzkzYy0xNDUxLTRhMzAtOWIxMS1kNGQ2NWI2ZTZhY2QifQ.' +
      'vLafGQ-xYuythrr9uAntMYeALQTixESSjr4UGnCMQduEEdTBb-TVCjcMCuqVHNS8' +
      '1KchVKlDMTA8BywaHTuJi7TudMvtEdDGVE__Jl1fk3Z-gO7MUh4rXfCY79yDsNpi' +
      'OjVEAgdVDlDYV8GgOh4pJh9ZQJqB9tc3Dzsa_iP9keEDHhKG3T2qQApx6hH-1wDq' +
      'bt2FS06DOIQrO2zZ9bTQ-8e5AaFxD4qJKD6RJuKxHP2lR8skO42DThYxXNkZfBMK' +
      'l_0lIXI7_b1POLHfKhvUA5-BkvSEQT4jm-LSiLzzpqttUD0paqX0QGaYvJAmEeJH' +
      '-R6g3LTZrUnjthGWgPyryw';

    const rsaNestedClientAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'L3cGm5zxi6zitN4XZKKUDVq1DiBC2PXUps477a0CghjFAi_julg8y3yaWI4g3AhM' +
      'Ttc1qZlFv0BNRMMqlViokynDtfru1IR3XpuYqwqkXMuR-l4JIc4XrL5orWlNit7y' +
      'VN36ja3AGR9xseryYVXsbQJ3ux6zi8ZNPDFM7hlxoa1N5GvKD6HSSmt8D11qfmJ-' +
      'ndzoEwAUxtb6PZqbXbvGy_EOWXY_I1O3LJZvG1MTKa8fMUsKfeIflETuqSmeMUVe' +
      'OGTP9VTb-DVBOvGMm0uTAyo1MOxCqEOt9OVlMLZhTwGfxIXWjcjB2pySx4eqOIXy' +
      'HFzvYt4xgApcbTPZBkP6kQ.' +
      '15euC7Ohx6Y95-j6.' +
      'E4Icvg0tRPGJgzbAswUGl5eGZpl5-Z6cSVz4iMJbqJsXxNnmfsA-hjN3v0yLoKCQ' +
      'aLa7k9d3d_dsG6JIEKmx0tPFv5e4qq6_QAFQzyq6jES1jpFlpGurB5TObc_kN9Tx' +
      '7puetWa5oFUn82J0-5xGayMjWQynLo5tsjbgusvPBPPSAR-pEuQhlj3CuQOKsLXr' +
      'sMjjNLvClHPutmZIIfqcvaYaRXTk0vqjb-c1lX8uZzQwyiaL9YgNSMZ6tmFSkItE' +
      'TKxqX4EDvuD7B_aMpK1g8oAEClz8hxKlIafUw_YNx6ta12gAvuss_73APK6iRw5B' +
      '8MoBy-KK_g-7GIdxCHGhlMwluCL2wZTx-b3r-mzjkPFKCstTZ0GfKciURAtlN-30' +
      'FjBfaSYH8PckWf1AymKyrmy2bh2WQisQKPwc_myafsUhmYUpo9Uj2qybOj3W2u4M' +
      'NoNIdnZgwzANjEtIk3EKjJYMQx1YyL7Zb5CE4_N8vFBJqnLtKw5gBSkC2E7Yv7v1' +
      'Yn-6xc87qG-g3tT_kD7cXZMLn-k8mImvMtbj_6vYlKtebiVhlE-vcGlOI0aBl5_v' +
      'nQkhAgCsOyuovpwcIj-Nsd-qOmW3_Ro0HjdH2eVhwADjsGrJ3-Tpo5Yh138QHRSL' +
      'Q4J0FxaOIZq7-3Dul3K2VcHLD4UTyiAcxxXvwiMN-7xSPu4z46tOv8uBXml_W_kF' +
      'dZeSxkYF8JWSQ6unjEm7xoeBH6a24Aq8gingRhcMCumYB4iKiBnGhMVreFFN7krn' +
      'VRY3IGXuXxcvBLmHvWxySRGq-Zcg2yf-DqmXenSEQD8CwqKf5Ymda4CTJUKGVmyY' +
      'h3Xfin6Sm8uRYw.' +
      'BhVqsrBb7_5u921uCRaw8g';

    const signedClientAssertion =
      'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVjLXNpZ24ta2V5In0.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJjbGllbnRfaWQiLCJhdWQiOiJodHRw' +
      'czovL3Byb3ZpZGVyLmV4YW1wbGUuY29tL29pZGMvdG9rZW4iLCJleHAiOjE3ODY0' +
      'OTMxMDAsImlhdCI6MTc4NjQ5MjgwMCwibmJmIjoxNzg2NDkyODAwLCJqdGkiOiIx' +
      'ODg0NzkzYy0xNDUxLTRhMzAtOWIxMS1kNGQ2NWI2ZTZhY2QifQ.' +
      'MEYCIQCAZYcTpa7tkCVvxri9fdBUmtqbjwiOWR0FiMIGl28GPwIhAMtBQ3jBZCz4' +
      '4ChXRJsEI47fAGvdScGTF8N-gjt5YT7G';

    const nestedClientAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'Qa7YJXXlkpQefIvS6rLBOnIa0jYuCKBnImqnAxO17lmFdGojeYYbCKdCOpVcplb-' +
      'jLeegz-0Zf8u-BNYT80hqEwHbMeejMl8bXXIRz1_lB_1g0aTyCFsReqwmUnOb4DB' +
      '8UD_OG967Tv6HMptxuCFn53-xNiy61mDY5Rj0Y_p7EdX6u-lA2k1zcB64woZUKu_' +
      'VIirM8HcLRD8G8FjjE4JVkzoAJ_V0ky32DVBqHNPWUvnEWnuOy69ccrI0QHMDfbr' +
      'Knqt3jQ3NyIYLp-m0foZ580vD5AxYMI94t1nkt8IGNYGZzWHaOEaMUYmiQfXqBOt' +
      'gj3tK8b1UjfnVX-Pcv46Hw.' +
      'ilNsYf20d7z9stjm.' +
      'UDRUpeDEgkUwiOCMdLRRyBeB4kBnQv2f6NYRiIzkWlyqN7VofJ-05P2-QJvgSWAa' +
      'Ue-ZJgvlLm3ij1P3NgjZtCzrjOccYuGeEKXQdTLx9oq710OXd0Y0ZxcoqY5CEYoj' +
      'pjFmJFztzAohys35d6zj5orfIVhygRIVXTC6jSJL5McTgXHobg0Yl656ZZF81TxA' +
      'X3vbHyAS2SZBaYWvzRrlphiCaaJpaC0q3jH97KGbgc-lT6_8imOFGAF1W19Vq49A' +
      'LL2Eg1_uTTyPSo3EHyKKhYVkXRYZjqkwbxLsSJ2UXA7LD0e_hi3ckSGFdXoKnlzK' +
      '--4R-3CVN6_wThz1KBQlhgCvLLlaWX8p3bi-knveZRZuyPTr08g8fISJ9ynjiqDP' +
      'Ja_QKxFqBla8OibEHOv7JJ4zAlfk-M-g6X9m6nAsKVvgaqXmtfqk7ajfozkzFO-P' +
      'jVBZCnIRCUmvnwTgaF48HXOSafu7pGMWyA0EyCqbY50cbT-KMPeslB83tZJ4vmr1' +
      '3iNm.' +
      '_2y0lG1YOTTLWeITqRikAA';

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

    it.each([rsaSignedClientAssertion, rsaNestedClientAssertion])(
      "should throw when failing to obtain the Client's Sign JSON Web Key.",
      async (clientAssertion) => {
        const request = requestFactory({ client_assertion: clientAssertion });

        dataAccessMock.getClientAssertionUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findClientById.mockResolvedValueOnce(rsaClient);

        const error = new InvalidClientError('Failed to authenticate the Client.');
        await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
          InvalidClientError,
          error.description,
        );

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          "[PrivateKeyJwtClientAuthentication] Failed to obtain the Client's Client Assertion Sign JSON Web Key",
          'cd722fbb-4708-427a-a588-c1f1f85feca0',
          { client_id: rsaClient.id, header: { alg: 'RS256', kid: 'rsa-sign-key' } },
          error,
        );
      },
    );

    it.each([signedClientAssertion, nestedClientAssertion])(
      'should return the Client of the Client Assertion.',
      async (clientAssertion) => {
        const request = requestFactory({ client_assertion: clientAssertion });

        dataAccessMock.getClientAssertionUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findClientById.mockResolvedValueOnce(client);

        await expect(clientAuthentication.getClient(request)).resolves.toBe(client);
      },
    );
  });
});
