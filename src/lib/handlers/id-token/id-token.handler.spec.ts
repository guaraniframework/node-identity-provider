import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import {
  EllipticCurveJsonWebKey,
  EncryptedJsonWebToken,
  InvalidJsonWebKeyError,
  JsonWebKeySet,
  JsonWebSignatureHeader,
  JsonWebTokenClaims,
  jwe,
  jwt,
  RsaJsonWebKey,
  SignedJsonWebTokenParameters,
} from '@guarani/jose';

import { IdTokenClaimsParameters } from '../../claims/id-token/id-token.claims.parameters';
import { UserinfoClaimsParameters } from '../../claims/userinfo/userinfo.claims.parameters';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Login } from '../../entities/login';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { SubjectType } from '../../subject-types/subject-type';
import { IdTokenHandler } from './id-token.handler';

jest.mock('../../logger/logger');

describe('ID Token Handler', () => {
  let handler: IdTokenHandler;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findJsonWebKey: jest.fn(),
      getClientWrapJsonWebKey: jest.fn(),
      getSignJsonWebKey: jest.fn(),
      getUnwrapJsonWebKey: jest.fn(),
      getUserinfo: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = {
    issuer: new URL('https://idp.example.com'),
    idTokenSignatureAlgorithms: ['ES256', 'RS256'],
    idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
    idTokenContentEncryptionAlgorithms: ['A128CBC-HS256'],
  };

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), {
      calculateSubjectIdentifier: jest.fn(),
      retrieveSubjectIdentifier: jest.fn(),
    }),
  );

  const ellipticCurveSignJsonWebKey = new EllipticCurveJsonWebKey({
    kty: 'EC',
    crv: 'P-256',
    x: '4c_cS6IT6jaVQeobt_6BDCTmzBaBOTmmiSCpjd5a6Og',
    y: 'mnrPnCFTDkGdEwilabaqM7DzwlAFgetZTmP9ycHPxF8',
    d: 'bwVX6Vx-TOfGKYOPAcu2xhaj3JUzs-McsC-suaHnFBo',
    alg: 'ES256',
    kid: 'ec-sign-key',
    use: 'sig',
  });

  const rsaSignJsonWebKey = new RsaJsonWebKey({
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

  const rsaKeyUnwrapJsonWebKey = new RsaJsonWebKey({
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

  const clientRsaKeyWrapJsonWebKey = new RsaJsonWebKey({
    kty: 'RSA',
    n:
      'sXchDaQebHnPiGvyDOAT4saGEUetSyo9MKLOoWFsueri23bOdgWp4Dy1WlUzewbg' +
      'BHod5pcM9H95GQRV3JDXboIRROSBigeC5yjU1hGzHHyXss8UDprecbAYxknTcQkh' +
      'slANGRUZmdTOQ5qTRsLAt6BTYuyvVRdhS8exSZEy_c4gs_7svlJJQ4H9_NxsiIoL' +
      'wAEk7-Q3UXERGYw_75IDrGA84-lA_-Ct4eTlXHBIY2EaV7t7LjJaynVJCpkv4LKj' +
      'TTAumiGUIuQhrNhZLuF_RJLqHpM2kgWFLU7-VTdL1VbC2tejvcI2BlMkEpk1BzBZ' +
      'I0KQB0GaDWFLN-aEAw3vRw',
    e: 'AQAB',
    d:
      'VFCWOqXr8nvZNyaaJLXdnNPXZKRaWCjkU5Q2egQQpTBMwhprMzWzpR8Sxq1OPThh' +
      '_J6MUD8Z35wky9b8eEO0pwNS8xlh1lOFRRBoNqDIKVOku0aZb-rynq8cxjDTLZQ6' +
      'Fz7jSjR1Klop-YKaUHc9GsEofQqYruPhzSA-QgajZGPbE_0ZaVDJHfyd7UUBUKun' +
      'FMScbflYAAOYJqVIVwaYR5zWEEceUjNnTNo_CVSj-VvXLO5VZfCUAVLgW4dpf1Sr' +
      'tZjSt34YLsRarSb127reG_DUwg9Ch-KyvjT1SkHgUWRVGcyly7uvVGRSDwsXypdr' +
      'NinPA4jlhoNdizK2zF2CWQ',
    p:
      '9gY2w6I6S6L0juEKsbeDAwpd9WMfgqFoeA9vEyEUuk4kLwBKcoe1x4HG68ik918h' +
      'dDSE9vDQSccA3xXHOAFOPJ8R9EeIAbTi1VwBYnbTp87X-xcPWlEPkrdoUKW60tgs' +
      '1aNd_Nnc9LEVVPMS390zbFxt8TN_biaBgelNgbC95sM',
    q:
      'uKlCKvKv_ZJMVcdIs5vVSU_6cPtYI1ljWytExV_skstvRSNi9r66jdd9-yBhVfuG' +
      '4shsp2j7rGnIio901RBeHo6TPKWVVykPu1iYhQXw1jIABfw-MVsN-3bQ76WLdt2S' +
      'DxsHs7q7zPyUyHXmps7ycZ5c72wGkUwNOjYelmkiNS0',
    dp:
      'w0kZbV63cVRvVX6yk3C8cMxo2qCM4Y8nsq1lmMSYhG4EcL6FWbX5h9yuvngs4iLE' +
      'Fk6eALoUS4vIWEwcL4txw9LsWH_zKI-hwoReoP77cOdSL4AVcraHawlkpyd2TWjE' +
      '5evgbhWtOxnZee3cXJBkAi64Ik6jZxbvk-RR3pEhnCs',
    dq:
      'o_8V14SezckO6CNLKs_btPdFiO9_kC1DsuUTd2LAfIIVeMZ7jn1Gus_Ff7B7IVx3' +
      'p5KuBGOVF8L-qifLb6nQnLysgHDh132NDioZkhH7mI7hPG-PYE_odApKdnqECHWw' +
      '0J-F0JWnUd6D2B_1TvF9mXA2Qx-iGYn8OVV1Bsmp6qU',
    qi:
      'eNho5yRBEBxhGBtQRww9QirZsB66TrfFReG_CcteI1aCneT0ELGhYlRlCtUkTRcl' +
      'IfuEPmNsNDPbLoLqqCVznFbvdB7x-Tl-m0l_eFTj2KiqwGqE9PZB9nNTwMVvH3VR' +
      'RSLWACvPnSiwP8N5Usy-WRXS-V7TbpxIhvepTfE0NNo',
    alg: 'RSA-OAEP',
    kid: 'rsa-keywrap-key',
    use: 'enc',
  });

  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 12, 0, 0, 0, 0) });
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(SubjectType).toValue(subjectTypeMock);
    container.bind(IdTokenHandler).toSelf().asSingleton();

    handler = container.resolve(IdTokenHandler);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.getClientWrapJsonWebKey().', () => {
      container.delete(DataAccess);
      container.delete(IdTokenHandler);

      const dataAccess = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          getUserinfo: jest.fn(),
          getSignJsonWebKey: jest.fn(),
          findJsonWebKey: jest.fn(),
        }),
      );

      container.bind(DataAccess).toValue(dataAccess);
      container.bind(IdTokenHandler).toSelf().asSingleton();

      const error = new TypeError('Missing implementation of required method "DataAccess.getClientWrapJsonWebKey".');
      expect(() => container.resolve(IdTokenHandler)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[IdTokenHandler] Missing implementation of required method "DataAccess.getClientWrapJsonWebKey"',
        '942b0f49-6892-47fc-966c-1522afbd1d2d',
        null,
        error,
      );
    });

    it('should throw when not implementing the method DataAccess.getUnwrapJsonWebKey().', () => {
      container.delete(DataAccess);
      container.delete(IdTokenHandler);

      const dataAccess = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          getUserinfo: jest.fn(),
          getSignJsonWebKey: jest.fn(),
          findJsonWebKey: jest.fn(),
          getClientWrapJsonWebKey: jest.fn(),
        }),
      );

      container.bind(DataAccess).toValue(dataAccess);
      container.bind(IdTokenHandler).toSelf().asSingleton();

      const error = new TypeError('Missing implementation of required method "DataAccess.getUnwrapJsonWebKey".');
      expect(() => container.resolve(IdTokenHandler)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.critical).toHaveBeenCalledExactlyOnceWith(
        '[IdTokenHandler] Missing implementation of required method "DataAccess.getUnwrapJsonWebKey"',
        'b82866ad-9981-47ae-a2fa-ebeb1a13b9bf',
        null,
        error,
      );
    });

    it('should not throw when not supporting encrypted ID Tokens.', () => {
      container.delete(DataAccess);
      container.delete<Partial<Settings>>(SETTINGS);
      container.delete(IdTokenHandler);

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
          findJsonWebKey: jest.fn(),
          getSignJsonWebKey: jest.fn(),
          getUserinfo: jest.fn(),
        }),
      );

      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind<Partial<Settings>>(SETTINGS).toValue({});
      container.bind(IdTokenHandler).toSelf().asSingleton();

      expect(() => container.resolve(IdTokenHandler)).not.toThrow();
    });
  });

  describe('generateIdToken()', () => {
    const signedClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'signed_client_id',
      idTokenSignedResponseAlgorithm: 'RS256',
      idTokenEncryptedResponseKeyWrap: null,
    });

    const nestedClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'nested_client_id',
      idTokenSignedResponseAlgorithm: 'ES256',
      idTokenEncryptedResponseKeyWrap: 'RSA-OAEP',
      idTokenEncryptedResponseContentEncryption: 'A128CBC-HS256',
    });

    it('should return a signed ID Token with the minimum required Claims.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
        scopes: ['openid', 'email'],
        client: signedClient,
        user,
      });

      const claims: IdTokenClaimsParameters & UserinfoClaimsParameters = {
        iss: 'https://idp.example.com/',
        sub: 'user_id',
        aud: ['signed_client_id'],
        exp: Math.ceil(Date.now() / 1000) + 86400,
        iat: Math.ceil(Date.now() / 1000),
        azp: 'signed_client_id',
        email: 'john.doe@email.com',
      };

      dataAccessMock.getSignJsonWebKey!.mockResolvedValueOnce(rsaSignJsonWebKey);
      dataAccessMock.getUserinfo!.mockResolvedValueOnce({ email: 'john.doe@email.com' });
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const idToken = await handler.generateIdToken(login, consent);

      await expect(jwt.signed.decode(idToken)).resolves.toStrictEqual<SignedJsonWebTokenParameters>({
        header: expect.any(JsonWebSignatureHeader),
        claims: new JsonWebTokenClaims(claims),
        signature: expect.any(Buffer),
      });
    });

    it('should return a signed ID Token with all supported Claims.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
        scopes: ['openid', 'email'],
        client: signedClient,
        user,
      });

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(
        Reflect.construct(AccessToken, []),
        { id: 'access_token' },
      );

      const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
        Reflect.construct(AuthorizationCode, []),
        { id: 'authorization_code' },
      );

      const claims: IdTokenClaimsParameters & UserinfoClaimsParameters = {
        iss: 'https://idp.example.com/',
        sub: 'user_id',
        aud: ['signed_client_id'],
        exp: Math.ceil(Date.now() / 1000) + 86400,
        iat: Math.ceil(Date.now() / 1000),
        azp: 'signed_client_id',
        nonce: 'nonce',
        auth_time: Math.ceil(Date.now() / 1000),
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
        at_hash: 'hrOQHuo3oE6FR82RIiX1SA',
        c_hash: 'pk3JJWstBOegJTRDDozDaw',
        email: 'john.doe@email.com',
      };

      dataAccessMock.getSignJsonWebKey!.mockResolvedValueOnce(rsaSignJsonWebKey);
      dataAccessMock.getUserinfo!.mockResolvedValueOnce({ email: 'john.doe@email.com' });
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const idToken = await handler.generateIdToken(login, consent, {
        nonce: 'nonce',
        maxAge: 1296000,
        accessToken,
        authorizationCode,
      });

      await expect(jwt.signed.decode(idToken)).resolves.toStrictEqual<SignedJsonWebTokenParameters>({
        header: expect.any(JsonWebSignatureHeader),
        claims: new JsonWebTokenClaims(claims),
        signature: expect.any(Buffer),
      });
    });

    it('should return a nested ID Token with the minimum required Claims.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
        scopes: ['openid', 'email'],
        client: nestedClient,
        user,
      });

      const claims: IdTokenClaimsParameters & UserinfoClaimsParameters = {
        iss: 'https://idp.example.com/',
        sub: 'user_id',
        aud: ['nested_client_id'],
        exp: Math.ceil(Date.now() / 1000) + 86400,
        iat: Math.ceil(Date.now() / 1000),
        azp: 'nested_client_id',
        email: 'john.doe@email.com',
      };

      dataAccessMock.getSignJsonWebKey!.mockResolvedValueOnce(ellipticCurveSignJsonWebKey);
      dataAccessMock.getUserinfo!.mockResolvedValueOnce({ email: 'john.doe@email.com' });
      dataAccessMock.getClientWrapJsonWebKey!.mockResolvedValueOnce(clientRsaKeyWrapJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const idToken = await handler.generateIdToken(login, consent);

      const { plaintext } = await jwe.compact.deserialize(idToken, {
        jsonWebKey: clientRsaKeyWrapJsonWebKey,
      });

      await expect(
        jwt.signed.deserialize(plaintext.toString('utf8'), { jsonWebKey: ellipticCurveSignJsonWebKey }),
      ).resolves.toStrictEqual<EncryptedJsonWebToken>({
        header: expect.any(JsonWebSignatureHeader),
        claims: new JsonWebTokenClaims(claims),
      });
    });

    it('should return a nested ID Token with all supported Claims.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
      });

      const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
        id: 'consent_id',
        scopes: ['openid', 'email'],
        client: nestedClient,
        user,
      });

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(
        Reflect.construct(AccessToken, []),
        { id: 'access_token' },
      );

      const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
        Reflect.construct(AuthorizationCode, []),
        { id: 'authorization_code' },
      );

      const claims: IdTokenClaimsParameters & UserinfoClaimsParameters = {
        iss: 'https://idp.example.com/',
        sub: 'user_id',
        aud: ['nested_client_id'],
        exp: Math.ceil(Date.now() / 1000) + 86400,
        iat: Math.ceil(Date.now() / 1000),
        azp: 'nested_client_id',
        nonce: 'nonce',
        auth_time: Math.ceil(Date.now() / 1000),
        amr: ['pwd', 'sms'],
        acr: 'urn:guarani:acr:2fa',
        at_hash: 'hrOQHuo3oE6FR82RIiX1SA',
        c_hash: 'pk3JJWstBOegJTRDDozDaw',
        email: 'john.doe@email.com',
      };

      dataAccessMock.getSignJsonWebKey!.mockResolvedValueOnce(ellipticCurveSignJsonWebKey);
      dataAccessMock.getUserinfo!.mockResolvedValueOnce({ email: 'john.doe@email.com' });
      dataAccessMock.getClientWrapJsonWebKey!.mockResolvedValueOnce(clientRsaKeyWrapJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const idToken = await handler.generateIdToken(login, consent, {
        nonce: 'nonce',
        maxAge: 1296000,
        accessToken,
        authorizationCode,
      });

      const { plaintext } = await jwe.compact.deserialize(idToken, {
        jsonWebKey: clientRsaKeyWrapJsonWebKey,
      });

      await expect(
        jwt.signed.deserialize(plaintext.toString('utf8'), { jsonWebKey: ellipticCurveSignJsonWebKey }),
      ).resolves.toStrictEqual<EncryptedJsonWebToken>({
        header: expect.any(JsonWebSignatureHeader),
        claims: new JsonWebTokenClaims(claims),
      });
    });
  });

  describe('checkIdTokenHint()', () => {
    const nestedClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'nested_client_id',
      jwks: new JsonWebKeySet([clientRsaKeyWrapJsonWebKey]).toJSON(),
      idTokenSignedResponseAlgorithm: 'ES256',
      idTokenEncryptedResponseKeyWrap: 'RSA-OAEP',
      idTokenEncryptedResponseContentEncryption: 'A128CBC-HS256',
    });

    const signedClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'signed_client_id',
      idTokenSignedResponseAlgorithm: 'RS256',
      idTokenEncryptedResponseKeyWrap: null,
    });

    const nestedIdToken =
      'eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhDQkMtSFMyNTYiLCJjdHkiOiJK' +
      'V1QiLCJraWQiOiJyc2Eta2V5dW53cmFwLWtleSJ9.' +
      'RaDPMMYtiY0qZ2a6hVvNyYSve1eOz6YK1XXCkZeowzfCwbaHopBpiqt3CqaQAEzU' +
      'cJm9CDTUG4Z-WsAkpXyTVW3w8MoQDYnGWzu9yK91vIXgVhV8YYD9AH4bpxKldrES' +
      'Gx00d6lkxvaasEQuIZ_j6hib-xwq-NwVxxqp77On1dhqGV4ABuTbGrSVccakHJ8p' +
      'MPRvEF6VjxvBzSIVMg105pA3GNTUmHvEDR9uZv_IGnumq72Uux8GBucg5I0zVUK4' +
      'vanno7dsyvoYtrexo1oYT9nAVgAwemjJEK0mhLD2pf865aXhKy_UxEGVvnoUmzjs' +
      'E1WnP4IpB5sNLVy4LFNpvQ.' +
      'qMwKcZ9h6rdjZLh_bpXtUA.' +
      'gbt0P_1CjFPSawAnGcFpP0pVUovsLRuR0_XV7n6quRsY0PDHrNouSpi5TQKezOlf' +
      'aa5ugtzC5iKELBC6ng4B778v8APlYZgzYIotr978x_PjeL6yz56H011qLXDu9FD-' +
      'GGC2qA76utj36Kgj-ut25nY1OsnIUWpBGqAwHUXi7O8_gntj5_g4u5DhW03-AuFB' +
      'DVUuSLEQEVnr-Y2e1cRsK_u622mUOUFiF6r22uJ8TKg2GxdbDsSnFzSVtChefJBU' +
      '2ti20gIcsshbMQMQGOGDHB59FaorkfUNUcMhsz4frRpzXyID-XQaWxJbd61VdrOh' +
      'wWo4RR_kcbAa-gZoCQN1UjiZBpWzm7XpcWcLhtYbNBaw3v7bdhtQDfiN0mS9rynN' +
      'Q942LwatZhWaxecR0A7-GlGcZLBc3lSMwmw1DANU7jdPQ7nW_nJLIHvlXFfBkSvB' +
      'lV7CYHIR2O16AsmlNNi-J1Ez-Wh1MaJ1KkJKL2Ja9nzHUsbdz3JFSqn0IU5ScnxY' +
      '.' +
      'TLN9nT8Fui7ImGCURjb18Q';

    const nestedInnerIdToken =
      'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVjLXNpZ24ta2V5IiwidHlwIjoiSldUIn0.' +
      'eyJpc3MiOiJodHRwczovL2lkcC5leGFtcGxlLmNvbS8iLCJzdWIiOiJ1c2VyX2lk' +
      'IiwiYXVkIjpbIm5lc3RlZF9jbGllbnRfaWQiXSwiZXhwIjoxNzg2NTkwMDAwLCJp' +
      'YXQiOjE3ODY1MDM2MDAsImF6cCI6Im5lc3RlZF9jbGllbnRfaWQiLCJlbWFpbCI6' +
      'ImpvaG4uZG9lQGVtYWlsLmNvbSJ9.' +
      'MEQCIFI9lA3vzWSCfIYj3qDQKbaM6uKDvZpixH7SBRJKqsdKAiBzRVPdxpgkoZW1' +
      'uLwUbWT36tgTc3rF_f2bLWG4mgShBQ';

    const signedIdToken =
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InJzYS1zaWduLWtleSIsInR5cCI6IkpXVCJ9' +
      '.' +
      'eyJpc3MiOiJodHRwczovL2lkcC5leGFtcGxlLmNvbS8iLCJzdWIiOiJ1c2VyX2lk' +
      'IiwiYXVkIjpbInNpZ25lZF9jbGllbnRfaWQiXSwiZXhwIjoxNzg2NTkwMDAwLCJp' +
      'YXQiOjE3ODY1MDM2MDAsImF6cCI6InNpZ25lZF9jbGllbnRfaWQiLCJlbWFpbCI6' +
      'ImpvaG4uZG9lQGVtYWlsLmNvbSJ9.' +
      'QS5MMl9gB1TfqPWyeCI_gM4yz9SGBOtplfcrLSc1cKVa-mx4k1nULRScS7cfVA70' +
      'wfoN2f8WBw6BjBF5frQYQhn90xtexxM_v82wsBs_iljYY3fF9_ExAo2SEXUbbjRW' +
      'rgwLOPpBeDjG-2nL_GSliidoEzXxZa2O36kJ6fSdn_Th-PXdKxD57RlvRJpe01wB' +
      'NMiRogLzjc5pkta5S-9WgxthVVdoips5QVLovP2IPBiw5XXmoZWGr77Oevsm9Bub' +
      't_tznv1xOPT1ocrsWXsCPl1n73Hnu7kRMYpWQ7eqxM7vXr8iH3dbAJMRUur3NISa' +
      'Afxca9etKQ8iVPDUwjIdhw';

    it('should return false when failing to deserialize the encrypted part of the provided nested ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new Error('Mock Error.');
      const jweDeserializeSpy = jest.spyOn(jwe.compact, 'deserialize').mockRejectedValueOnce(error);

      await expect(handler.checkIdTokenHint(nestedIdToken, nestedClient, login)).resolves.toBeFalse();

      expect(jweDeserializeSpy).toHaveBeenCalledExactlyOnceWith(nestedIdToken, {
        expectedContentEncryptionAlgorithms: [nestedClient.idTokenEncryptedResponseContentEncryption!],
        expectedKeyManagementAlgorithms: [nestedClient.idTokenEncryptedResponseKeyWrap!],
        jsonWebKey: rsaKeyUnwrapJsonWebKey,
      });

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: nestedIdToken, client: nestedClient, login, result: false, error },
      );
    });

    it('should return false when failing to decode the signed part of the provided nested ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new Error('Mock Error.');
      const jwtDecodeSpy = jest.spyOn(jwt.signed, 'decode').mockRejectedValueOnce(error);

      await expect(handler.checkIdTokenHint(nestedIdToken, nestedClient, login)).resolves.toBeFalse();

      expect(jwtDecodeSpy).toHaveBeenCalledExactlyOnceWith(nestedInnerIdToken, {
        ignoreExpired: true,
        validationOptions: {
          iss: { essential: true, value: settings.issuer!.href },
          sub: { essential: true, value: user.id },
          aud: { essential: true, values: [nestedClient.id, [nestedClient.id]] },
        },
      });

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: nestedIdToken, client: nestedClient, login, result: false, error },
      );
    });

    it('should return false when failing to decode the provided signed ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new Error('Mock Error.');
      const jwtDecodeSpy = jest.spyOn(jwt.signed, 'decode').mockRejectedValueOnce(error);

      await expect(handler.checkIdTokenHint(signedIdToken, nestedClient, login)).resolves.toBeFalse();

      expect(jwtDecodeSpy).toHaveBeenCalledExactlyOnceWith(signedIdToken, {
        ignoreExpired: true,
        validationOptions: {
          iss: { essential: true, value: settings.issuer!.href },
          sub: { essential: true, value: user.id },
          aud: { essential: true, values: [nestedClient.id, [nestedClient.id]] },
        },
      });

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: signedIdToken, client: nestedClient, login, result: false, error },
      );
    });

    it('should return false when failing to obtain the JSON Web Key represented by the provided Key ID of the nested ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(null);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new InvalidJsonWebKeyError('Could not find the JSON Web Key "ec-sign-key".');
      await expect(handler.checkIdTokenHint(nestedIdToken, nestedClient, login)).resolves.toBeFalse();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: nestedIdToken, client: nestedClient, login, result: false, error },
      );
    });

    it('should return false when failing to obtain the JSON Web Key represented by the provided Key ID of the signed ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(null);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new InvalidJsonWebKeyError('Could not find the JSON Web Key "rsa-sign-key".');
      await expect(handler.checkIdTokenHint(signedIdToken, signedClient, login)).resolves.toBeFalse();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: signedIdToken, client: signedClient, login, result: false, error },
      );
    });

    it('should return false when failing to deserialize the signed part of the provided nested ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(ellipticCurveSignJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new Error('Mock Error.');
      const jwtDeserializeSpy = jest.spyOn(jwt.signed, 'deserialize').mockRejectedValueOnce(error);

      await expect(handler.checkIdTokenHint(nestedIdToken, nestedClient, login)).resolves.toBeFalse();

      expect(jwtDeserializeSpy).toHaveBeenCalledExactlyOnceWith(nestedInnerIdToken, {
        jsonWebKey: ellipticCurveSignJsonWebKey,
        expectedDigitalSignatureAlgorithms: Array.from(settings.idTokenSignatureAlgorithms!),
      });

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: nestedIdToken, client: nestedClient, login, result: false, error },
      );
    });

    it('should return false when failing to deserialize the provided signed ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(rsaSignJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      const error = new Error('Mock Error.');
      const jwtDeserializeSpy = jest.spyOn(jwt.signed, 'deserialize').mockRejectedValueOnce(error);

      await expect(handler.checkIdTokenHint(signedIdToken, signedClient, login)).resolves.toBeFalse();

      expect(jwtDeserializeSpy).toHaveBeenCalledExactlyOnceWith(signedIdToken, {
        jsonWebKey: rsaSignJsonWebKey,
        expectedDigitalSignatureAlgorithms: Array.from(settings.idTokenSignatureAlgorithms!),
      });

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: signedIdToken, client: signedClient, login, result: false, error },
      );
    });

    it('should return true when successfully checking the provided nested ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(ellipticCurveSignJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      await expect(handler.checkIdTokenHint(nestedIdToken, nestedClient, login)).resolves.toBeTrue();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '492bfa48-4c2e-473d-9e74-8ec6982195d8',
        { id_token: nestedIdToken, client: nestedClient, login, result: true },
      );
    });

    it('should return true when successfully checking the provided signed ID Token.', async () => {
      const login: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), {
        id: 'login_id',
        createdAt: new Date(),
        user,
      });

      dataAccessMock.getUnwrapJsonWebKey!!.mockResolvedValueOnce(rsaKeyUnwrapJsonWebKey);
      dataAccessMock.findJsonWebKey!.mockResolvedValueOnce(rsaSignJsonWebKey);
      subjectTypeMock.calculateSubjectIdentifier.mockReturnValueOnce(user.id);

      await expect(handler.checkIdTokenHint(signedIdToken, signedClient, login)).resolves.toBeTrue();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[IdTokenHandler] Completed checkIdTokenHint()',
        '492bfa48-4c2e-473d-9e74-8ec6982195d8',
        { id_token: signedIdToken, client: signedClient, login, result: true },
      );
    });
  });
});
