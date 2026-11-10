import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { INTROSPECTION_CLIENT_AUTHENTICATION } from '../../constants';
import { IntrospectionContext } from '../../context/introspection/introspection-context';
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
import { IntrospectionRequest } from '../../requests/introspection/introspection-request';
import { TokenTypeHint } from '../../types/token-type-hint.type';
import { Validator } from '../validator';

/**
 * Validator for the Introspection Endpoint Http Request.
 *
 * It parses the Parameters of the Introspection Request and populates its actors.
 */
@Injectable()
export class IntrospectionValidator extends Validator<IntrospectionContext> {
  /**
   * Name of the Endpoint that uses this Validator.
   */
  public readonly endpoint: EndpointName = 'introspection';

  /**
   * Http Request Methods supported by the Validator.
   */
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.POST];

  /**
   * Token Type Hints supported by the Introspection Endpoint.
   */
  readonly #supportedTokenTypeHints: TokenTypeHint[] = ['access_token'];

  /**
   * Instantiates a new Introspection Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param clientAuthenticationMethods Introspection Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(INTROSPECTION_CLIENT_AUTHENTICATION)
    private readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger);

    if (typeof this.dataAccess.findRefreshTokenById === 'function') {
      this.#supportedTokenTypeHints.push('refresh_token');
    }
  }

  /**
   * Validates the Http Request and returns the actors of the Introspection Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Introspection Context.
   */
  public async validate(request: HttpRequest): Promise<IntrospectionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'e40de1c0-f22c-4ffe-a0e1-ed6f52416962', {
      request,
    });

    this.checkHttpRequestMethod(request);

    const parameters = request.form<IntrospectionRequest>();

    const client = await this.clientAuthenticationHandler.authenticate(request, this.clientAuthenticationMethods);
    const token = await this.findToken(parameters);

    if (token === null || token.client === null) {
      const context: IntrospectionContext = { parameters, client, token: null };

      this.logger.debug(`[${this.constructor.name}] Completed validate()`, '01127180-8009-4283-b281-df5fc1a7de30', {
        request,
        context,
      });

      return context;
    }

    const context: IntrospectionContext = { parameters, client, token };

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '016de1dc-8318-4ffe-9b6f-e1feae231ca7', {
      request,
      context,
    });

    return context;
  }

  /**
   * Searches the application's storage for a Token that satisfies the Token Identifier provided by the Client.
   *
   * @param parameters Parameters of the Introspection Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {UnsupportedTokenTypeError} The provided Token Type Hint is unsupported.
   * @returns Resulting Token and its type.
   */
  private async findToken(parameters: IntrospectionRequest): Promise<AccessToken | RefreshToken | null> {
    this.logger.debug(`[${this.constructor.name}] Called findToken()`, '94a83ca1-639f-41d1-bd2b-e266f6d7b96e', {
      parameters,
    });

    if (!('token' in parameters) || !isNonEmptyString(parameters.token)) {
      const error = new InvalidRequestError('Invalid parameter "token".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "token"`,
        '267a9b3d-7418-4423-827a-70f8e2fcdfcd',
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
          '33ed0447-db84-4c80-b845-3a31f8ae5215',
          { parameters },
          error,
        );

        throw error;
      }

      if (!this.#supportedTokenTypeHints.includes(parameters.token_type_hint)) {
        const error = new UnsupportedTokenTypeError(`Unsupported Token Type Hint "${parameters.token_type_hint}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported Token Type Hint "${parameters.token_type_hint}"`,
          '977e0b43-118b-4f90-9d62-f2fdb9232720',
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

    this.logger.debug(`[${this.constructor.name}] Completed findToken()`, 'c95d00d5-9b2e-4934-ae2c-bb0d19f325d1', {
      parameters,
      token,
    });

    return token;
  }
}
