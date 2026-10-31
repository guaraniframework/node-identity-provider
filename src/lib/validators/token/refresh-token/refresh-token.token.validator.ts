import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { RefreshTokenTokenContext } from '../../../context/token/refresh-token/refresh-token.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { RefreshToken } from '../../../entities/refresh-token';
import { Scope } from '../../../entities/scope';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { RefreshTokenTokenRequest } from '../../../requests/token/refresh-token/refresh-token.token-request';
import { secureStringCompare } from '../../../utils/secure-string-compare/secure-string-compare';
import { TokenValidator } from '../token.validator';

/**
 * Implementation of the Refresh Token Token Validator.
 */
@Injectable()
export class RefreshTokenTokenValidator extends TokenValidator<RefreshTokenTokenContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public readonly name: GrantTypeName = 'refresh_token';

  /**
   * Instantiates a new Refresh Token Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    @InjectAll(GrantType) protected override readonly grantTypes: GrantType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);

    if (typeof this.dataAccess.findRefreshTokenById !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.findRefreshTokenById".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.findRefreshTokenById"`,
        'e72b3d93-76b2-4de6-8068-7e58a254d7d1',
        null,
        error,
      );

      throw error;
    }
  }

  /**
   * Validates the Http Request and returns the actors of the Refresh Token Token Context.
   *
   * @param request Http Request.
   * @returns Refresh Token Token Context.
   */
  public override async validate(request: HttpRequest): Promise<RefreshTokenTokenContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'd9a9b512-946c-4f18-b645-81507a500d31', {
      request,
    });

    const context = await super.validate(request);

    const { client, parameters } = context;

    const refreshToken = await this.getRefreshToken(parameters);
    const scopes = await this.getScopes(parameters, refreshToken, client);

    this.checkRefreshToken(refreshToken, client);

    Object.assign<RefreshTokenTokenContext, Partial<RefreshTokenTokenContext>>(context, { refreshToken, scopes });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '1a66508c-5942-4c68-82c1-2929f85c944a', {
      request,
      context,
    });

    return context;
  }

  /**
   * Fetches the requested Refresh Token from the application's storage.
   *
   * @param parameters Parameters of the Refresh Token Token Request.
   * @returns Refresh Token based on the provided Token.
   */
  private async getRefreshToken(parameters: RefreshTokenTokenRequest): Promise<RefreshToken> {
    this.logger.debug(`[${this.constructor.name}] Called getRefreshToken()`, 'ea3d2423-ef01-4897-844a-6acc170c423b', {
      parameters,
    });

    if (!('refresh_token' in parameters) || !isNonEmptyString(parameters.refresh_token)) {
      const error = new InvalidRequestError('Invalid parameter "refresh_token".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "refresh_token"`,
        'f81beada-6951-4a17-a92c-279f3c18d1a0',
        { parameters },
        error,
      );

      throw error;
    }

    const refreshToken = await this.dataAccess.findRefreshTokenById!(parameters.refresh_token);

    if (!(refreshToken instanceof RefreshToken)) {
      const error = new InvalidGrantError('Invalid Refresh Token.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Refresh Token`,
        'e308cf51-c9fb-461e-bcd6-3e91ff0b395e',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getRefreshToken()`,
      'a6bad51d-d594-4ee3-b021-243883a57b56',
      { parameters, refresh_token_id: refreshToken.id },
    );

    return refreshToken;
  }

  /**
   * Returns the original Scopes of the provided Refresh Token, or the subset requested by the Client.
   *
   * @param parameters Parameters of the Refresh Token Token Request.
   * @param refreshToken Refresh Token provided by the Client.
   * @param client Client of the Request.
   * @returns Scopes granted to the Client.
   */
  private async getScopes(
    parameters: RefreshTokenTokenRequest,
    refreshToken: RefreshToken,
    client: Client,
  ): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '4692dd7c-451a-414c-a279-48e5b3b50d7a', {
      parameters,
      refresh_token_id: refreshToken.id,
      client_id: client.id,
    });

    if (!('scope' in parameters)) {
      const allowedScopes = refreshToken.scopes;

      this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '327e87d2-dc47-4a7f-9f53-4962317a3e73', {
        parameters,
        refresh_token_id: refreshToken.id,
        client_id: client.id,
        allowed_scopes: allowedScopes.map((scope) => scope.name),
      });

      return allowedScopes;
    }

    if (!isNonEmptyString(parameters.scope)) {
      const error = new InvalidRequestError('Invalid parameter "scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "scope"`,
        '104ded58-99fd-4791-91cb-a65ae8fc166b',
        { parameters, refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );

      throw error;
    }

    const scopes = parameters.scope.split(' ');
    await this.scopeHandler.checkRequestedScopes(scopes);
    const allowedScopes = await this.scopeHandler.getAllowedScopes(client, scopes);

    const refreshTokenScopesNames = refreshToken.scopes.map((scope) => scope.name);
    const allowedScopesNames = allowedScopes.map((scope) => scope.name);

    allowedScopesNames.forEach((allowedScope) => {
      if (!refreshTokenScopesNames.includes(allowedScope)) {
        const error = new InvalidGrantError(`The Scope "${allowedScope}" was not previously granted.`);

        this.logger.error(
          `[${this.constructor.name}] The Scope "${allowedScope}" was not previously granted`,
          '83f97acd-b875-481f-b6a1-5b9ce33ec1ab',
          { parameters, refresh_token_id: refreshToken.id, client_id: client.id },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '741c978f-b0a2-4037-b8b6-23d38d62e069', {
      parameters,
      refresh_token_id: refreshToken.id,
      client_id: client.id,
      allowed_scopes: allowedScopesNames,
    });

    return allowedScopes;
  }

  /**
   * Checks the Refresh Token against the provided data and against the Client of the Request.
   *
   * @param refreshToken Refresh Token provided by the Client.
   * @param client Client of the Request.
   * @throws {InvalidGrantError} The provided Refresh Token is invalid.
   */
  private checkRefreshToken(refreshToken: RefreshToken, client: Client): void {
    this.logger.debug(`[${this.constructor.name}] Called checkRefreshToken()`, '28a4ba06-2991-4b81-a213-fe7c332161c6', {
      refresh_token_id: refreshToken.id,
      client_id: client.id,
    });

    if (!secureStringCompare(client.id, refreshToken.client.id)) {
      const error = new InvalidGrantError('Invalid Refresh Token.');

      this.logger.error(
        `[${this.constructor.name}] Mismatching Client Identifier`,
        '84ca7dde-d9aa-4169-aa37-ea758facb3c4',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );

      throw error;
    }

    const now = new Date();

    if (now < refreshToken.validAfter) {
      const error = new InvalidGrantError('Invalid Refresh Token.');

      this.logger.error(
        `[${this.constructor.name}] Refresh Token not yet valid`,
        '9f576636-3175-4b0b-94cd-b58a8a46f471',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );

      throw error;
    }

    if (now > refreshToken.expiresAt) {
      const error = new InvalidGrantError('Invalid Refresh Token.');

      this.logger.error(
        `[${this.constructor.name}] Expired Refresh Token`,
        '8993e731-ab0f-4e95-93e4-e98c9f3ece55',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );

      throw error;
    }

    if (refreshToken.revokedAt instanceof Date) {
      const error = new InvalidGrantError('Invalid Refresh Token.');

      this.logger.error(
        `[${this.constructor.name}] Revoked Refresh Token`,
        'b4a9ed5f-b13c-49cc-abf3-2ca0b0a64cd0',
        { refresh_token_id: refreshToken.id, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed checkRefreshToken()`,
      '274aa6d0-2a01-4899-a1c8-ee958a8b016b',
      { refresh_token_id: refreshToken.id, client_id: client.id },
    );
  }
}
