import { URL } from 'url';

import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { AuthorizationCodeTokenContext } from '../../../context/token/authorization-code/authorization-code.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { AuthorizationCode } from '../../../entities/authorization-code';
import { Client } from '../../../entities/client';
import { AccessDeniedError } from '../../../errors/access-denied/access-denied.error';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { AuthorizationCodeTokenRequest } from '../../../requests/token/authorization-code/authorization-code.token-request';
import { secureStringCompare } from '../../../utils/secure-string-compare/secure-string-compare';
import { TokenValidator } from '../token.validator';

/**
 * Implementation of the Authorization Code Token Validator.
 */
@Injectable()
export class AuthorizationCodeTokenValidator extends TokenValidator<AuthorizationCodeTokenContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public readonly name: GrantTypeName = 'authorization_code';

  /**
   * Instantiates a new Authorization Code Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(GrantType) protected override readonly grantTypes: GrantType[],
    @InjectAll(PKCE) private readonly pkces: PKCE[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);
  }

  /**
   * Validates the Http Request and returns the actors of the Authorization Code Token Context.
   *
   * @param request Http Request.
   * @returns Authorization Code Token Context.
   */
  public override async validate(request: HttpRequest): Promise<AuthorizationCodeTokenContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '635bf9a5-ebb3-491f-add5-31d81005e521', {
      request,
    });

    const context = await super.validate(request);

    const { client, parameters } = context;

    const authorizationCode = await this.getAuthorizationCode(parameters);
    const redirectUri = this.getRedirectUri(parameters, client);
    const codeVerifier = this.getCodeVerifier(parameters);

    this.checkAuthorizationCode(authorizationCode, client, redirectUri, codeVerifier);

    Object.assign<AuthorizationCodeTokenContext, Partial<AuthorizationCodeTokenContext>>(context, {
      authorizationCode,
      redirectUri,
      codeVerifier,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'ca03bd3d-3595-4e46-bc67-4754077d05d0', {
      request,
      context,
    });

    return context;
  }

  /**
   * Fetches the requested Authorization Code from the application's storage.
   *
   * @param parameters Parameters of the Authorization Code Token Request.
   * @returns Authorization Code based on the provided Code.
   */
  private async getAuthorizationCode(parameters: AuthorizationCodeTokenRequest): Promise<AuthorizationCode> {
    this.logger.debug(
      `[${this.constructor.name}] Called getAuthorizationCode()`,
      '2e2fc67e-2e19-4875-acaa-474adadc6d89',
      { parameters },
    );

    if (!('code' in parameters) || !isNonEmptyString(parameters.code)) {
      const error = new InvalidRequestError('Invalid parameter "code".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code"`,
        'ac5c085a-1f70-4757-ac7b-a725e23fba7c',
        { parameters },
        error,
      );

      throw error;
    }

    const authorizationCode = await this.dataAccess.findAuthorizationCodeById(parameters.code);

    if (!(authorizationCode instanceof AuthorizationCode)) {
      const error = new InvalidGrantError('Invalid Authorization Code.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Authorization Code`,
        '85c3cca1-15a5-482e-baf5-f5171595c96b',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getAuthorizationCode()`,
      '6b775350-e8ae-4dd8-a752-5db1c49e0cc3',
      { parameters, authorization_code_id: authorizationCode.id },
    );

    return authorizationCode;
  }

  /**
   * Parses and validates the Redirect URI provided by the Client.
   *
   * @param parameters Parameters of the Authorization Code Token Request.
   * @param client Client of the Request.
   * @throws {AccessDeniedError} The Client is not allowed to use the provided Redirect URI.
   * @throws {InvalidRequestError} The provided parameter "redirect_uri" is invalid.
   * @returns Parsed and validated Redirect URI.
   */
  private getRedirectUri(parameters: AuthorizationCodeTokenRequest, client: Client): URL {
    this.logger.debug(`[${this.constructor.name}] Called getRedirectUri()`, '359b88e3-485b-4a1c-8af1-f5bd2cd5a123', {
      parameters,
      client_id: client.id,
    });

    if (
      !('redirect_uri' in parameters) ||
      !isNonEmptyString(parameters.redirect_uri) ||
      !URL.canParse(parameters.redirect_uri)
    ) {
      const error = new InvalidRequestError('Invalid parameter "redirect_uri".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "redirect_uri"`,
        '743a7428-a1b8-4184-b815-c334f363a8cd',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    const redirectUri = new URL(parameters.redirect_uri);

    if (isNonEmptyString(redirectUri.hash)) {
      const error = new InvalidRequestError('The Redirect URI must not have a fragment component.');

      this.logger.error(
        `[${this.constructor.name}] The Redirect URI must not have a fragment component`,
        'db7a2571-f064-4d4f-9511-b93e80fe4ea8',
        { parameters, client_id: client.id, redirect_uri: redirectUri.href },
        error,
      );

      throw error;
    }

    if (
      !client.redirectUris.some((clientRedirectUri) => secureStringCompare(clientRedirectUri.href, redirectUri.href))
    ) {
      const error = new AccessDeniedError('Invalid Redirect URI.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Redirect URI`,
        '747c1958-b29b-4b34-8ab4-4ca42086b81a',
        { parameters, client_id: client.id, redirect_uri: redirectUri.href },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getRedirectUri()`, 'b12cf04d-1c42-4975-92d0-5d9de931c878', {
      parameters,
      client_id: client.id,
      redirect_uri: redirectUri.href,
    });

    return redirectUri;
  }

  /**
   * Checks and returns the Code Verifier provided by the Client.
   *
   * @param parameters Parameters of the Token Request.
   * @returns Code Verifier provided by the Client.
   */
  private getCodeVerifier(parameters: AuthorizationCodeTokenRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getCodeVerifier()`, 'e60c8dcd-1d91-4db1-b251-a821a3e1fff3', {
      parameters,
    });

    if (!('code_verifier' in parameters) || !isNonEmptyString(parameters.code_verifier)) {
      const error = new InvalidRequestError('Invalid parameter "code_verifier".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_verifier"`,
        '9ab35a24-5bb2-4bfc-b980-a6c029b42c73',
        { parameters },
        error,
      );

      throw error;
    }

    const codeVerifier = parameters.code_verifier;

    this.logger.debug(`[${this.constructor.name}] Called getCodeVerifier()`, '15299544-de20-4519-bc04-741e2b4c86fa', {
      parameters,
      code_verifier: codeVerifier,
    });

    return codeVerifier;
  }

  /**
   * Checks the Authorization Code against the provided data and against the Client of the Request.
   *
   * @param authorizationCode Authorization Code provided by the Client.
   * @param client Client of the Request.
   * @param redirectUri Redirect URI provided by the Client.
   * @param codeVerifier Code Verifier provided by the Client.
   * @throws {InvalidGrantError} The provided Authorization Code is invalid.
   */
  private checkAuthorizationCode(
    authorizationCode: AuthorizationCode,
    client: Client,
    redirectUri: URL,
    codeVerifier: string,
  ): void {
    this.logger.debug(
      `[${this.constructor.name}] Called checkAuthorizationCode()`,
      'cd5d2103-1e6e-4e46-90ac-0fe6fa2fb213',
      {
        authorization_code_id: authorizationCode.id,
        client_id: client.id,
        redirect_uri: redirectUri.href,
        code_verifier: codeVerifier,
      },
    );

    const { consent, parameters } = authorizationCode;

    if (!secureStringCompare(client.id, consent.client.id)) {
      const error = new InvalidGrantError('Invalid Authorization Code.');

      this.logger.error(
        `[${this.constructor.name}] Mismatching Client Identifier`,
        '8165a641-0754-405b-b459-24c0abb9b2ec',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    const now = new Date();

    if (now < authorizationCode.validAfter) {
      const error = new InvalidGrantError('Invalid Authorization Code.');

      this.logger.error(
        `[${this.constructor.name}] Authorization Code not yet valid`,
        '76f0b0eb-ec42-4d4a-8516-e352a7c3359c',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    if (now > authorizationCode.expiresAt) {
      const error = new InvalidGrantError('Invalid Authorization Code.');

      this.logger.error(
        `[${this.constructor.name}] Expired Authorization Code`,
        '53207c70-ed20-40b3-9f00-1c0532a9b5f5',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    if (authorizationCode.revokedAt instanceof Date) {
      const error = new InvalidGrantError('Invalid Authorization Code.');

      this.logger.error(
        `[${this.constructor.name}] Revoked Authorization Code`,
        'dc99eb49-4683-4a34-af41-ab6bdf64e60f',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(parameters.redirect_uri, redirectUri.href)) {
      const error = new InvalidGrantError('Mismatching Redirect URI.');

      this.logger.error(
        `[${this.constructor.name}] Mismatching Redirect URI`,
        '54c613b4-4c30-4466-beba-d529d5a2503b',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    const pkceMethod = this.pkces.find((pkce) => pkce.name === parameters['code_challenge_method']!)!;

    if (!pkceMethod.verify(parameters['code_challenge']!, codeVerifier)) {
      const error = new InvalidGrantError('Mismatching PKCE Code Verifier.');

      this.logger.error(
        `[${this.constructor.name}] Mismatching PKCE Code Verifier`,
        '6664bf0d-2d4f-419c-b174-e9211dc6368f',
        {
          authorization_code_id: authorizationCode.id,
          client_id: client.id,
          redirect_uri: redirectUri.href,
          code_verifier: codeVerifier,
        },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed checkAuthorizationCode()`,
      '50133bbd-158a-4a54-ad89-373bbdf99865',
      {
        authorization_code_id: authorizationCode.id,
        client_id: client.id,
        redirect_uri: redirectUri.href,
        code_verifier: codeVerifier,
      },
    );
  }
}
