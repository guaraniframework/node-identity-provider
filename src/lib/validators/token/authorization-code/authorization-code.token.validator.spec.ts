import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CONTAINER, TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { AuthorizationCodeTokenContext } from '../../../context/token/authorization-code/authorization-code.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { AuthorizationCode } from '../../../entities/authorization-code';
import { Client } from '../../../entities/client';
import { Consent } from '../../../entities/consent';
import { AccessDeniedError } from '../../../errors/access-denied/access-denied.error';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { AuthorizationRequest } from '../../../requests/authorization/authorization-request';
import { AuthorizationCodeTokenRequest } from '../../../requests/token/authorization-code/authorization-code.token-request';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { TokenValidator } from '../token.validator';
import { AuthorizationCodeTokenValidator } from './authorization-code.token.validator';

jest.mock('../../../client-authentication/client-authentication');
jest.mock('../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../loggers/logger');

const invalidCodes: any[] = [undefined, ''];
const invalidRedirectURIs: any[] = [undefined, '', 'a'];
const invalidCodeVerifiers: any[] = [undefined, ''];

describe('Authorization Code Token Validator', () => {
  let validator: AuthorizationCodeTokenValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findAuthorizationCodeById: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), {
      name: 'authorization_code',
    }),
  );

  const pkceMock = jest.mocked<PKCE>(
    Object.assign<PKCE, Partial<PKCE>>(Reflect.construct(PKCE, []), { name: 'S256', verify: jest.fn() }),
  );

  const clientAuthenticationMethodMock = jest.mocked(ClientAuthentication.prototype);

  beforeEach(() => {
    superValidateSpy = jest.spyOn(TokenValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind(PKCE).toValue(pkceMock);
    container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    container.bind(AuthorizationCodeTokenValidator).toSelf().asSingleton();

    validator = container.resolve(AuthorizationCodeTokenValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "authorization_code" as its value.', () => {
      expect(validator.name).toBe<GrantTypeName>('authorization_code');
    });
  });

  describe('validate()', () => {
    let parameters!: AuthorizationCodeTokenRequest;

    let authorizationRequestParameters!: AuthorizationRequest;
    let client!: Client;
    let consent!: Consent;
    let authorizationCode!: AuthorizationCode;

    const requestFactory = (data: Partial<AuthorizationCodeTokenRequest> = {}): HttpRequest => {
      removeNullishValues<AuthorizationCodeTokenRequest>(Object.assign(parameters, data));

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
        grant_type: 'authorization_code',
        code: 'authorization_code',
        redirect_uri: 'https://client.example.com/oidc/callback',
        code_verifier: 'code_challenge',
      };

      authorizationRequestParameters = {
        redirect_uri: 'https://client.example.com/oidc/callback',
        code_challenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        code_challenge_method: 'S256',
      } as unknown as AuthorizationRequest;

      client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'client_id',
        redirectUris: [new URL('https://client.example.com/oidc/callback')],
        grantTypes: ['authorization_code'],
      });

      consent = Object.assign<Consent, Partial<Consent>>(new Consent(), { id: 'consent_id', client });

      authorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(new AuthorizationCode(), {
        id: 'authorization_code',
        parameters: authorizationRequestParameters,
        consent,
      });
    });

    it.each(invalidCodes)('should throw when the provided parameter "code" is invalid.', async (code) => {
      const request = requestFactory({ code });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "code".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Invalid parameter "code"',
        'ac5c085a-1f70-4757-ac7b-a725e23fba7c',
        { parameters },
        error,
      );
    });

    it('should throw when no Authorization Code is found.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(null);

      const error = new InvalidGrantError('Invalid Authorization Code.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Invalid Authorization Code',
        '85c3cca1-15a5-482e-baf5-f5171595c96b',
        { parameters },
        error,
      );
    });

    it.each(invalidRedirectURIs)(
      'should throw when the provided parameter "redirect_uri" is invalid.',
      async (redirectUri) => {
        const request = requestFactory({ redirect_uri: redirectUri });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

        const error = new InvalidRequestError('Invalid parameter "redirect_uri".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[AuthorizationCodeTokenValidator] Invalid parameter "redirect_uri"',
          '743a7428-a1b8-4184-b815-c334f363a8cd',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when the provided Redirect URI has a fragment component.', async () => {
      const request = requestFactory({ redirect_uri: 'https://client.example.com/oidc/callback#foo=bar' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidRequestError('The Redirect URI must not have a fragment component.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] The Redirect URI must not have a fragment component',
        'db7a2571-f064-4d4f-9511-b93e80fe4ea8',
        { parameters, client_id: client.id, redirect_uri: parameters.redirect_uri },
        error,
      );
    });

    it('should throw when the Client is not allowed to use the requested Redirect URI.', async () => {
      const request = requestFactory({ redirect_uri: 'https://client.example.org/oidc/callback' });

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new AccessDeniedError('Invalid Redirect URI.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Invalid Redirect URI',
        '747c1958-b29b-4b34-8ab4-4ca42086b81a',
        { parameters, client_id: client.id, redirect_uri: parameters.redirect_uri },
        error,
      );
    });

    it.each(invalidCodeVerifiers)(
      'should throw when the provided parameter "code_verifier" is invalid.',
      async (codeVerifier) => {
        const request = requestFactory({ code_verifier: codeVerifier });

        clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
        dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

        const error = new InvalidRequestError('Invalid parameter "code_verifier".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[AuthorizationCodeTokenValidator] Invalid parameter "code_verifier"',
          '9ab35a24-5bb2-4bfc-b980-a6c029b42c73',
          { parameters },
          error,
        );
      },
    );

    it('should throw on a mismatching Client Identifier.', async () => {
      const request = requestFactory();

      const consentClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'another_client_id',
        redirectUris: [new URL('https://client.example.com/oidc/callback')],
        grantTypes: ['authorization_code'],
      });

      Reflect.set(consent, 'client', consentClient);

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidGrantError('Invalid Authorization Code.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Mismatching Client Identifier',
        '8165a641-0754-405b-b459-24c0abb9b2ec',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should throw when the Authorization Code is not yet valid.', async () => {
      const request = requestFactory();

      Reflect.set(authorizationCode, 'validAfter', new Date(Date.now() + 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidGrantError('Invalid Authorization Code.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Authorization Code not yet valid',
        '76f0b0eb-ec42-4d4a-8516-e352a7c3359c',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should throw when the Authorization Code is expired.', async () => {
      const request = requestFactory();

      Reflect.set(authorizationCode, 'expiresAt', new Date(Date.now() - 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidGrantError('Invalid Authorization Code.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Expired Authorization Code',
        '53207c70-ed20-40b3-9f00-1c0532a9b5f5',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should throw when the Authorization Code is revoked.', async () => {
      const request = requestFactory();

      Reflect.set(authorizationCode, 'revokedAt', new Date(Date.now() - 3600000));

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidGrantError('Invalid Authorization Code.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Revoked Authorization Code',
        'dc99eb49-4683-4a34-af41-ab6bdf64e60f',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should throw on a mismatching Redirect URI.', async () => {
      const request = requestFactory();

      Reflect.set(authorizationRequestParameters, 'redirect_uri', 'https://client.example.org/oidc/callback');

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);

      const error = new InvalidGrantError('Mismatching Redirect URI.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Mismatching Redirect URI',
        '54c613b4-4c30-4466-beba-d529d5a2503b',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should throw on a mismatching PKCE Code Verifier.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);
      pkceMock.verify.mockReturnValueOnce(false);

      const error = new InvalidGrantError('Mismatching PKCE Code Verifier.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidGrantError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationCodeTokenValidator] Mismatching PKCE Code Verifier',
        '6664bf0d-2d4f-419c-b174-e9211dc6368f',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: parameters.redirect_uri,
          code_verifier: parameters.code_verifier,
        },
        error,
      );
    });

    it('should return an Authorization Code Token Context.', async () => {
      const request = requestFactory();

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
      dataAccessMock.findAuthorizationCodeById.mockResolvedValueOnce(authorizationCode);
      pkceMock.verify.mockReturnValueOnce(true);

      await expect(validator.validate(request)).resolves.toStrictEqual<AuthorizationCodeTokenContext>(
        expect.objectContaining<AuthorizationCodeTokenContext>({
          parameters,
          grantType: grantTypeMock,
          client,
          authorizationCode,
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          codeVerifier: 'code_challenge',
        }),
      );
    });
  });
});
