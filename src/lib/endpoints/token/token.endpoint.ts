import { OutgoingHttpHeaders } from 'http';

import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString, removeNullishValues } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedGrantTypeError } from '../../errors/unsupported-grant-type/unsupported-grant-type.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { TokenRequest } from '../../requests/token/token-request';
import { asIdentityProviderError } from '../../utils/as-identity-provider-error/as-identity-provider-error';
import { TokenValidator } from '../../validators/token/token.validator';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Token Endpoint.
 *
 * This endpoint is used by the Client to exchange an Authorization Grant for an Access Token
 * that will be used to act on behalf of the Resource Owner.
 */
@Injectable()
export class TokenEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'token';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/token';

  /**
   * Http Routes of the Endpoint.
   */
  public readonly routes: HttpRoute[] = [{ method: HttpRequestMethod.POST, handler: this.handle }];

  /**
   * Default Http Headers to be included in the Response.
   */
  private readonly headers: OutgoingHttpHeaders = { 'cache-control': 'no-store', pragma: 'no-cache' };

  /**
   * Instantiates a new Token Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param validators Token Validators of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    @InjectAll(TokenValidator) private readonly validators: TokenValidator[],
  ) {
    super();
  }

  /**
   * Creates a Http JSON Access Token Response.
   *
   * This method is responsible for issuing Tokens to Clients that succeed to authenticate
   * within the Identity Provider and have the necessary Consent of the Resource Owner.
   *
   * If the Client fails to authenticate within the Identity Provider, does not have the Consent
   * of the Resource Owner, or provides invalid or insufficient request parameters,
   * it will receive an Error Response with a JSON object describing the error.
   *
   * If the flow succeeds, the Client will then receive its Token in a JSON object containing the Access Token,
   * the Token Type, the Lifespan of the Access Token, the scopes of the Access Token, and an optional Refresh Token,
   * as well as any optional parameters defined by supplementar specifications.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '89cf77e3-8fb5-424f-be9d-3e52254dc75e', {
      request,
    });

    const parameters = request.form<TokenRequest>();

    try {
      const validator = this.getValidator(parameters);

      const context = await validator.validate(request);
      const tokenResponse = await context.grantType.handle(context);

      const response = new HttpResponse().setHeaders(this.headers).json(removeNullishValues(tokenResponse));

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'a5bccca4-d94d-4b9d-af02-8ccf271a208c', {
        request,
        response,
      });

      return response;
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);

      const response = new HttpResponse()
        .setStatus(error.status)
        .setHeaders(error.headers)
        .setHeaders(this.headers)
        .json(removeNullishValues(error.toJSON()));

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, '2b1a3dfc-ed13-448d-8510-992f4d448a57', {
        request,
        response,
      });

      return response;
    }
  }

  /**
   * Retrieves the Token Validator based on the Grant Type requested by the Client.
   *
   * @param parameters Parameters of the Token Request.
   * @returns Token Validator.
   */
  private getValidator(parameters: TokenRequest): TokenValidator {
    this.logger.debug(`[${this.constructor.name}] Called getValidator()`, 'dd06bae0-16e6-41fe-b432-678ff7d90355', {
      parameters,
    });

    if (!isNonEmptyString(parameters.grant_type)) {
      const error = new InvalidRequestError('Invalid parameter "grant_type".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "grant_type"`,
        '8c9df96c-5d27-4ab8-b484-61e4c6f934c7',
        { parameters },
        error,
      );

      throw error;
    }

    const validator = this.validators.find((validator) => validator.name === parameters.grant_type);

    if (!(validator instanceof TokenValidator)) {
      const error = new UnsupportedGrantTypeError(`Unsupported Grant Type "${parameters.grant_type}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported Grant Type "${parameters.grant_type}"`,
        '00232cfe-e92d-487c-b313-64c1dc2f71cf',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getValidator()`, 'b3e82bc6-950f-4e4c-8b67-42a0c87ea5a2', {
      parameters,
      validator,
    });

    return validator;
  }
}
