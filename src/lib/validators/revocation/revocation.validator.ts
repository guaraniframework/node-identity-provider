import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { REVOCATION_CLIENT_AUTHENTICATION } from '../../constants';
import { RevocationContext } from '../../context/revocation/revocation-context';
import { DataAccess } from '../../data-access/data-access';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { AccessToken } from '../../entities/access-token';
import { RefreshToken } from '../../entities/refresh-token';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedTokenTypeError } from '../../errors/unsupported-token-type/unsupported-token-type.error';
import { ClientAuthenticationHandler } from '../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { RevocationRequest } from '../../requests/revocation/revocation-request';
import { TokenTypeHint } from '../../types/token-type-hint.type';
import { Validator } from '../validator';

/**
 * Validator for the Revocation Endpoint Http Request.
 *
 * It parses the Parameters of the Revocation Request and populates its actors.
 */
@Injectable()
export class RevocationValidator extends Validator<RevocationContext> {
  /**
   * Name of the Endpoint that uses this Validator.
   */
  public readonly endpoint: EndpointName = 'revocation';

  /**
   * Http Request Methods supported by the Validator.
   */
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.POST];

  /**
   * Token Type Hints supported by the Revocation Endpoint.
   */
  readonly #supportedTokenTypeHints: TokenTypeHint[] = ['access_token'];

  /**
   * Instantiates a new Revocation Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param clientAuthenticationMethods Revocation Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(REVOCATION_CLIENT_AUTHENTICATION) private readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger);

    if (typeof this.dataAccess.findRefreshTokenById === 'function') {
      this.#supportedTokenTypeHints.push('refresh_token');
    }
  }

  /**
   * Validates the Http Request and returns the actors of the Token Context.
   *
   * @param request Http Request.
   * @returns Token Context.
   */
  public async validate(request: HttpRequest): Promise<RevocationContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '172a3169-7a52-4247-ae51-d121c73359e7', {
      request,
    });

    this.checkHttpRequestMethod(request);

    const parameters = request.form<RevocationRequest>();

    const client = await this.clientAuthenticationHandler.authenticate(request, this.clientAuthenticationMethods);
    const token = await this.findToken(parameters);

    if (token === null || token.client === null) {
      const context: RevocationContext = { parameters, client, token: null };

      this.logger.debug(`[${this.constructor.name}] Completed validate()`, '1a635a72-3b8a-47e1-9a07-69b12389e97a', {
        request,
        context,
      });

      return context;
    }

    const context: RevocationContext = { parameters, client, token };

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'b843530c-0eee-4ab2-a027-6b0e44a6761c', {
      request,
      context,
    });

    return context;
  }

  /**
   * Searches the application's storage for a Token that satisfies the Token Identifier provided by the Client.
   *
   * @param parameters Parameters of the Revocation Request.
   * @returns Resulting Token and its type.
   */
  private async findToken(parameters: RevocationRequest): Promise<AccessToken | RefreshToken | null> {
    this.logger.debug(`[${this.constructor.name}] Called findToken()`, '718534b0-cd9a-46e5-935b-2546df66d134', {
      parameters,
    });

    if (!('token' in parameters) || !isNonEmptyString(parameters.token)) {
      const error = new InvalidRequestError('Invalid parameter "token".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "token"`,
        '77fb891e-04f9-4ad2-9c72-ab0deeda123b',
        { parameters },
        error,
      );

      throw error;
    }

    if ('token_type_hint' in parameters) {
      if (!isNonEmptyString(parameters.token_type_hint)) {
        const error = new InvalidRequestError('Invalid parameter "token_type_hint".');

        this.logger.error(
          `[${this.constructor.name}] Invalid parameter "token_type_hint"`,
          'd1dc5d07-1b9b-46fc-97e4-d302925fd0b5',
          { parameters },
          error,
        );

        throw error;
      }

      if (!this.#supportedTokenTypeHints.includes(parameters.token_type_hint)) {
        const error = new UnsupportedTokenTypeError(`Unsupported Token Type Hint "${parameters.token_type_hint}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported Token Type Hint "${parameters.token_type_hint}"`,
          'b30a3503-5f84-4959-8a37-ea9b4accf3dc',
          { parameters },
          error,
        );

        throw error;
      }
    }

    let token: AccessToken | RefreshToken | null;

    switch (parameters.token_type_hint) {
      case 'refresh_token':
        token =
          (await this.dataAccess.findRefreshTokenById!(parameters.token)) ??
          (await this.dataAccess.findAccessTokenById(parameters.token));

        break;

      case 'access_token':
      default:
        token =
          (await this.dataAccess.findAccessTokenById(parameters.token)) ??
          (await this.dataAccess.findRefreshTokenById?.(parameters.token)) ??
          null;

        break;
    }

    this.logger.debug(`[${this.constructor.name}] Completed findToken()`, 'f26608f0-0002-4695-81b5-22755534d318', {
      parameters,
      token,
    });

    return token;
  }
}
