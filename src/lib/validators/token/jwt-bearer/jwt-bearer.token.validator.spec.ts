import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { EllipticCurveJsonWebKey, RsaJsonWebKey } from '@guarani/jose';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { JwtBearerTokenContext } from '../../../context/token/jwt-bearer/jwt-bearer.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { ClientSecret } from '../../../entities/client-secret';
import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { AccessDeniedError } from '../../../errors/access-denied/access-denied.error';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { InvalidScopeError } from '../../../errors/invalid-scope/invalid-scope.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { Logger } from '../../../loggers/logger';
import { JwtBearerTokenRequest } from '../../../requests/token/jwt-bearer/jwt-bearer.token-request';
import { Settings } from '../../../settings/settings';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from '../token.validator';
import { JwtBearerTokenValidator } from './jwt-bearer.token.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

const invalidAssertions: any[] = [undefined, ''];

describe('JWT Bearer Token Validator', () => {
  let validator: JwtBearerTokenValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findUserById: jest.fn(),
      getJwtBearerGrantUnwrapJsonWebKey: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
      jwtBearerGrantSigningAlgorithms: ['HS256', 'ES256', 'RS256'],
      jwtBearerGrantEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
      jwtBearerGrantEncryptionContentEncryptionAlgorithms: ['A128GCM'],
    }),
  );

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), {
      name: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  const ellipticCurveClientSignJsonWebKey = new EllipticCurveJsonWebKey({
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
    kid: 'rsa-sign-key',
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

  const scopes: Scope[] = ['foo', 'bar', 'baz'].map((scope) =>
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
  );

  const clientSecret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
    secret: 'dZD9jxWOFEiSi-9AjOwmvJKaEJRUBbXl',
  });

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    secrets: [clientSecret],
    scopes,
    grantTypes: ['urn:ietf:params:oauth:grant-type:jwt-bearer'],
    jwks: { keys: [ellipticCurveClientSignJsonWebKey.toJSON()] },
    jwtBearerGrantSigningAlgorithm: 'ES256',
  });

  const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    superValidateSpy = jest.spyOn(TokenValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(JwtBearerTokenValidator).toSelf().asSingleton();

    validator = container.resolve(JwtBearerTokenValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "urn:ietf:params:oauth:grant-type:jwt-bearer" as its value.', () => {
      expect(validator.name).toBe<GrantTypeName>('urn:ietf:params:oauth:grant-type:jwt-bearer');
    });
  });

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.getJwtBearerGrantUnwrapJsonWebKey().', () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {}),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
      container.bind(ScopeHandler).toValue(scopeHandlerMock);
      container.bind(Settings).toValue(settingsMock);
      container.bind(GrantType).toValue(grantTypeMock);
      container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind(JwtBearerTokenValidator).toSelf().asSingleton();

      const error = new TypeError(
        'Missing implementation of required method "DataAccess.getJwtBearerGrantUnwrapJsonWebKey".',
      );
      expect(() => container.resolve(JwtBearerTokenValidator)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.fatal).toHaveBeenCalledExactlyOnceWith(
        '[JwtBearerTokenValidator] Missing implementation of required method "DataAccess.getJwtBearerGrantUnwrapJsonWebKey"',
        'b2d29f38-58ba-485d-a50b-844efe7f75b9',
        null,
        error,
      );
    });
  });

  describe('validate()', () => {
    let parameters!: JwtBearerTokenRequest;

    const noneSignedAssertion =
      'eyJhbGciOiJub25lIn0.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJ1c2VyX2lkIiwiYXVkIjpbImh0dHBz' +
      'Oi8vcHJvdmlkZXIuZXhhbXBsZS5jb20vb2lkYy90b2tlbiJdLCJpYXQiOjE3ODY0' +
      'OTI4MDAsImV4cCI6MTc4NjU3OTIwMH0.';

    const noneNestedAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'kArQ9GFRtS-RWO3BDVzAlYgoJpu-QB9yK0mHBTjI1rxIPgx_tCXdt7a3Dbv9ME1p' +
      'PQChgwn3CFCCcpmcQ14wB9ga4WRp10mVIi1hLK5_8rDDOYKTJXBB995uaeoMsUwZ' +
      'kYulwJPcxlA-EWrhKbnsz8yfxPnNTjLcvkM9C4jmNvA4QJMYHIpiz0Nc3sBwOQwy' +
      '8xAqGnOAgTxFMGG5g4mUBWsKDT7-0Y_NvE4ZmWZDQtllmm2l94yV44YPAvoiSDHP' +
      'FBq0PP0-5bd-7fF17hlHKbWzI800-jncgdmeCHyLyaaQZRF8bqvjg3pS7Xc3lj27' +
      'Fgb_gLzCE9jejOteL-fn6A.' +
      'wtK1N9LaJq9aZ0Bx.' +
      'EpKxRUfg_RCK-rstTVmWzufJMPTOzpGzHWLfEkWn0FA_P81k2V_uDd2Nw7powLPO' +
      'X0cv6E_p1U9cbO0V4PAR0MBsDtlYzcTL4bOPK-2nNnjEXchfrNeJkKgkL57qT7Jr' +
      '2OoSvY5e7f8BPlpJCOsbt10LzsXM_Wlu2fABPK0tEZXfwtcbpuNdX96ry9CaMbUK' +
      'r__7RsFcxhG3ZabqeHr0lvzIuiZmbT1R-tQFZt78sQqPP55F.' +
      'aUyxM2CE8HDLdGCIQJXtVw';

    const hmacSignedAssertion =
      'eyJhbGciOiJIUzI1NiJ9.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJ1c2VyX2lkIiwiYXVkIjpbImh0dHBz' +
      'Oi8vcHJvdmlkZXIuZXhhbXBsZS5jb20vb2lkYy90b2tlbiJdLCJpYXQiOjE3ODY0' +
      'OTI4MDAsImV4cCI6MTc4NjU3OTIwMH0.' +
      'Ri1_OcO6hBx8DITq8NGtRWL_oyArk5sCK9pg8gSdp5Y';

    const hmacNestedAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'ipCwgkz54GNOOoz0UGDW7hKjog7b77B13grN2cV0b1zPgOjpBpv58RH8LmAnBFdG' +
      'ZcsFZUWtzx0JYcJFYUgOe6v9lmfIw8TLPbxaV2E50536t8t-gdm1r_4fracH4xRE' +
      '04Q48EMwjxuHQHOjGHsmwqyIQxqjmqTtQgEp_FVJ-HJU2Z-xCqlJjwloFQNvESaa' +
      'ftsz-8frQmnP3zMeId9EstU4nohWh6rodIFb4NmK6Nc8uZUl-6n4sZ1HIExQPe-w' +
      'AGbW31QRKEvopleaYCjUVlJ5B0SLHte1fu3vfk-RCHtpA05tDHdCL1ucKYCd9oQh' +
      'oJ4A5sSJGg-Cka60VYUMDA.' +
      'FlE3F3ydpqc-uRqu.' +
      'r_fI-oC5HmmLLnnTDpYGUstwY02kPjkGOThzsGrjGibLEkOFz3OOgvHipZWJgBpA' +
      'vDzFX_G56qun_WuhE4PEYuD6XPVjxcJ8fGD9wS2g7XPxUp58RovmqcFbCm77CmA5' +
      'EgHSE33NqKeY7gb_kEfwPszprID7519_bRBYcaEL6IkgIJIW658QoEmtFQnFqDoQ' +
      'yWAUPcEUlqqqwh_7UJt-zLcsElu4qgfC-4toeDE1HCwDEqBuvb6fKuHrTvzlBhcE' +
      'Pdbb7ogPD8xzIIQaBU7aVgcVtKVqksJyvcPWTokumFQ.' +
      '-IjElgDXV46roRqfkkTHbQ';

    const rsaSignedAssertion =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InJzYS1zaWduLWtleSJ9.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJ1c2VyX2lkIiwiYXVkIjpbImh0dHBz' +
      'Oi8vcHJvdmlkZXIuZXhhbXBsZS5jb20vb2lkYy90b2tlbiJdLCJpYXQiOjE3ODY0' +
      'OTI4MDAsImV4cCI6MTc4NjU3OTIwMH0.' +
      'tuBGPLseCTsxbB3YkX7I8zhv4rqeqyUgF9DJeqOoLWactcl0jpWM9wTCYfwz8GfV' +
      'pz90C8aGh-opW93adqhy0aEOu6Oafh0MMCgqCHdOh66v-xAe4s_kmyndhbnamnJ1' +
      'KRxvNBa5AeireSjFJs3h4OBkf1JiqQgqaLE49467apQRGf7tpI0390O8VEbWrgdI' +
      '7Xex_fTXbWJdxH2G3fS5twEwTISwr99sHu7WPUX287wEEW6mgIWrI2dKSx8Tu1b4' +
      'AiU1Rml07KFNZRt_YzAhZkPqPn44-ut5nX1ikuMCW9zPvHv59Okpysrv3zOrhnVq' +
      'aa7N4mUJIajKUZ6IKkOJuw';

    const rsaNestedAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'lcbT5d5BwFjnCTyPRIu8i8_X7_HmAUvOhLT8Y3NIAKtlb6pT8HXI7GvTOGm1tk8Y' +
      'dTSLvCVc2I-f6UILZ5gvUXMTXfMTWggd2cJtHK5t6dSYQ3ZcgAimqomiW8Wj4Cli' +
      'QlTOILNB7fvxAjosr5htH2mXtRfCFBRXayfXX1lqy0l0WBhF6K54ES4gWVVap7E7' +
      'c3qcNDpA1oKbk6oWPxG9vhQVJVDdMCNv9SorKkrlOJmCGsfrSwSqGAocqaYUshg0' +
      'YtmiwOYPXV-XCtVPt8wEbfrNkFX5-WjN-xzo3_BLLhWTYiqvxRreO7tAkDzC9JUV' +
      'u3P0y5lB7Yj8S0YtHpDKkw.' +
      'c4h5Z4KEsNkvxWrX.' +
      'J3Kwlxjj303el1xOmGq25cnFSDz-WMDtbQ9SXsN3tU1n0trPsSgophqIGI1c_QHA' +
      'RMP-BgwpVjFHsKwdFqGS6JsRuQg_wb38lfrzzchEDO7Qbgz4iLIh7wq1UFeCTsHV' +
      'V4TZtwIpb8Ty8y_XGmQwIeGbK_AaxNQ-qGtfwlUAgr_b3fmZReR3gxPPx-_9Rzs3' +
      'yY4xTIrCQZVYvm6Sv45yBXpzbOWBS-bd4dx4NCk0V8HHcw9gDu8NWtGBOhKV-uPV' +
      'plUmL_js6uFHErJdOYDJweIBqRtFr-zqqivmVnYlN8a1cgrRKCe5qThKelERjNL6' +
      'YM4TKvqugpZXrm0GDINgzaKkaIKXbvWXt5XV6CFZ_C31cw9mkN63k6WmpO0Ddnt0' +
      'PF9nEVafPZWSP3lDnNxVSzmcY7NMXfGJ0IAMYVDQEpYVsYcCzeeyeUaLFSBL3mjT' +
      'xld1xTtAEJnJ2eAuJogNyCvWZbHuyihR6M0AzeTVftEeKMGpHp_cEYjfoKFzoSL6' +
      '5xjRSd6kUQ_xmxccVIoToitg3vPA1LB_u86vOemviBAATaddtxhWW2XTmZbhvTfW' +
      '8SmvO0fHMJ6ChRcM2V6XYUd2Xgo6c2lPDNtXed-lr6bpmNlsRQhkEzaLkxCDnQJJ' +
      'a5IudPQX0QRGGeUt5fg3cbYP1977Bk_fdpfnzFVv-7x39u8Qag3nRyrCCKx_BuTB' +
      'ztgWoUoVh51_bQgR43rozwqKa_5nmDc.' +
      'gJjmsOa5HyXPe0zuR-gCCw';

    const ellipticCurveSignedAssertion =
      'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVjLXNpZ24ta2V5In0.' +
      'eyJpc3MiOiJjbGllbnRfaWQiLCJzdWIiOiJ1c2VyX2lkIiwiYXVkIjpbImh0dHBz' +
      'Oi8vcHJvdmlkZXIuZXhhbXBsZS5jb20vb2lkYy90b2tlbiJdLCJpYXQiOjE3ODY0' +
      'OTI4MDAsImV4cCI6MTc4NjU3OTIwMH0.' +
      'MEQCIBw2FWZZBEGK2kZWc9_5Ed-zR0ma2gkVRiaJy9H6JuzwAiAYbkOi5h8ZJxwM' +
      'dKFkIpnYr3N0CvhhyCO3oH0qJ7xYkQ';

    const ellipticCurveNestedAssertion =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00iLCJraWQiOiJyc2Eta2V5' +
      'dW53cmFwLWtleSJ9.' +
      'D66HeHtKMzPJm-zf0GGLIyBB2xbL3JNgYx0Fnaln5kAVRTgC1W_SjJ5CFiyvPwSc' +
      'Qp1nJ3px9BaW_13zptjlG8sIaK9VAC3h-j8iSnnHmCKMPXxM5hgLpKcJJCBfiYn3' +
      'ynKTqQYYe3jZnMxJ3K3NKsIjy5SIW0N_arAlgbPhd3-FlV16ABh7_xM9yOCqLnaY' +
      'TmSW7lkL050UGjndeOZ4C8dlQMRpdDpeNLu8WakqS5y_0hFEks-1FM6BFXXWjgJ7' +
      'B4p94Hob8J8oyom1i78LY0oIz4BxW-3biZIRxj3nIm5HtkUEp6rpBtPGjFCWU2Ss' +
      'cvqrk0FAJ4aESdRCFHn90w.' +
      'pZOU-N26CPO76hrk.' +
      'sGODY2YPalYlwTRxqgcCA_1Kr-2L9DTFaZN1j4UwAzXMTKq-bv2PBTEDETvROGzc' +
      'SrbwNcVIWhuW0xoF5hgWXQ6fHx7EWVoonF_Yo5sh7AyIbQraCrMcMp166Nyt6Bep' +
      'c-VkpzHwNIqBg8vltB8rrEExH_swBsPRMvW8A78fFWGUB3jeq4srB3Vio3yq6fsp' +
      '4aIiMlHIQOKHa82a_6kNrT5mFTC0P4ggaEiPShH8z_Bx4zXnc9pVVDaiXvoj-hmJ' +
      'qzr8nRyiKZMqqWE7LFl_r3h3A020pFaw3263kKB0EyEHtZlIMIzuYdEMinparXPC' +
      'CbFH5NZphuwCPm4GrHswMEpMECeDPXR5uwtbUWxQIQOTNaibig4CnB-eOiyPgHf6' +
      'APCr11yENLJAsjaNorI.' +
      'e4deB1UU8tEbK2gfOhkl8g';

    const requestFactory = (data: Partial<JwtBearerTokenRequest> = {}): HttpRequest => {
      removeNullishValues<JwtBearerTokenRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: HttpRequestMethod.POST,
        url: addParametersToUrl('https://provider.example.com/oidc/token', parameters),
      });
    };

    beforeEach(() => {
      parameters = {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: 'assertion',
        scope: 'foo bar',
      };
    });

    it.each(invalidAssertions)(
      'should throw when the provided parameter "assertion" is invalid.',
      async (assertion) => {
        const request = requestFactory({ assertion });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

        const error = new InvalidRequestError('Invalid parameter "assertion".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[JwtBearerTokenValidator] Invalid parameter "assertion"',
          'beb456cd-ce83-4b95-b595-4373f6d42695',
          { request, parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when a JOSE Error occurs.', async () => {
      const request = requestFactory({ assertion: 'assertion' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(rsaClientSignJsonWebKey);

      const error = new InvalidGrantError('Invalid JSON Web Token Assertion.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[JwtBearerTokenValidator] Invalid JSON Web Token Assertion',
        '07fe7cd3-1cae-4ac0-bb32-14574ae8ef59',
        { request, parameters, client_id: client.id },
        error,
      );
    });

    it.each([noneNestedAssertion, noneSignedAssertion])(
      'should throw when decoding an Assertion with the JSON Web Signature Algorithm "none".',
      async (assertion) => {
        const request = requestFactory({ assertion });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);

        const error = new InvalidGrantError(
          'The Identity Provider disallows using the JSON Web Signature Algorithm "none".',
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[JwtBearerTokenValidator] The Client tried to use the JSON Web Signature Algorithm "none"',
          'c9353b6a-02c1-425c-bc71-b8765c4e1b3a',
          { request, parameters, client_id: client.id },
          error,
        );
      },
    );

    it.each([rsaNestedAssertion, rsaSignedAssertion])(
      'should throw when decoding an Assertion using an unsupported JSON Web Signature Algorithm.',
      async (assertion) => {
        const request = requestFactory({ assertion });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);

        Reflect.set(settingsMock, 'jwtBearerGrantSigningAlgorithms', ['ES256']);

        const error = new InvalidGrantError('Unsupported JSON Web Signature Algorithm "RS256".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

        Reflect.set(settingsMock, 'jwtBearerGrantSigningAlgorithms', ['HS256', 'ES256', 'RS256']);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[JwtBearerTokenValidator] Unsupported JSON Web Signature Algorithm "RS256"',
          'ed9ac8df-0bad-4f38-85c7-7bfbe3410d7e',
          { request, parameters, client_id: client.id },
          error,
        );
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      'should throw when failing to obtain the User from the Assertion.',
      async (assertion) => {
        const request = requestFactory({ assertion });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(null);

        const error = new InvalidGrantError('Could not find the User of the Assertion.');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[JwtBearerTokenValidator] Could not find the User of the Assertion',
          '5e0d0a94-11d3-4a91-9b3e-085511a77a07',
          { request, parameters, client_id: client.id },
          error,
        );
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      'should throw when the provided parameter "scope" is invalid.',
      async (assertion) => {
        const request = requestFactory({ assertion, scope: '' });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(user);

        const error = new InvalidRequestError('Invalid parameter "scope".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[JwtBearerTokenValidator] Invalid parameter "scope"',
          '1c4db530-a5ac-4587-93f7-ad9313812094',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      'should throw when the Client requests an unsupported Scope.',
      async (assertion) => {
        const request = requestFactory({ assertion, scope: 'foo bar unknown' });

        const error = new InvalidScopeError('Unsupported Scope "unknown".');

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(user);
        scopeHandlerMock.checkRequestedScopes.mockRejectedValueOnce(error);

        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidScopeError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).not.toHaveBeenCalled();
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      "should throw when the Client requests a Scope it's not allowed to.",
      async (assertion) => {
        const request = requestFactory({ assertion, scope: 'foo bar qux' });

        const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(user);
        scopeHandlerMock.getAllowedScopes.mockRejectedValueOnce(error);

        await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

        expect(loggerMock.error).not.toHaveBeenCalled();
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      "should return a JWT Bearer Token Context with the Client's default Scopes.",
      async (assertion) => {
        const request = requestFactory({ assertion, scope: undefined! });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(user);
        scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(client.scopes);

        await expect(validator.validate(request)).resolves.toStrictEqual<JwtBearerTokenContext>(
          expect.objectContaining<JwtBearerTokenContext>({
            parameters,
            grantType: grantTypeMock,
            client,
            user,
            scopes,
          }),
        );
      },
    );

    it.each([hmacNestedAssertion, hmacSignedAssertion, ellipticCurveNestedAssertion, ellipticCurveSignedAssertion])(
      'should return a JWT Bearer Token Context with the requested Scopes.',
      async (assertion) => {
        const request = requestFactory({ assertion });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.getJwtBearerGrantUnwrapJsonWebKey!.mockResolvedValueOnce(unwrapJsonWebKey);
        dataAccessMock.findUserById.mockResolvedValueOnce(user);
        scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(
          scopes.filter((scope) => parameters.scope!.includes(scope.name)),
        );

        await expect(validator.validate(request)).resolves.toStrictEqual<JwtBearerTokenContext>(
          expect.objectContaining<JwtBearerTokenContext>({
            parameters,
            grantType: grantTypeMock,
            client,
            user,
            scopes: scopes.filter((scope) => scope.name !== 'baz'),
          }),
        );
      },
    );
  });
});
