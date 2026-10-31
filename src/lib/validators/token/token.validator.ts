import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { TokenContext } from '../../context/token/token-context';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { Client } from '../../entities/client';
import { UnauthorizedClientError } from '../../errors/unauthorized-client/unauthorized-client.error';
import { GrantType } from '../../grant-types/grant-type';
import { GrantTypeName } from '../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { TokenRequest } from '../../requests/token/token-request';
import { Validator } from '../validator';

/**
 * Validator for the Token Endpoint Http Request.
 *
 * It parses the Parameters of the Token Request and populates its actors.
 */
export abstract class TokenValidator<TContext extends TokenContext = TokenContext> extends Validator<TContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public abstract readonly name: GrantTypeName;

  /**
   * Name of the Endpoint that uses this Validator.
   */
  public readonly endpoint: EndpointName = 'token';

  /**
   * Http Request Methods supported by the Validator.
   */
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.POST];

  /**
   * Instantiates a new Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    protected readonly grantTypes: GrantType[],
    protected readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger);
  }

  /**
   * Validates the Http Request and returns the actors of the Token Context.
   *
   * @param request Http Request.
   * @returns Token Context.
   */
  public async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'f12ae6fa-0119-4bdd-bd34-33de4590b606', {
      request,
    });

    this.checkHttpRequestMethod(request);

    const parameters = request.form<TokenRequest>();

    const client = await this.clientAuthenticationHandler.authenticate(request, this.clientAuthenticationMethods);
    const grantType = this.getGrantType(parameters, client);

    const context = <TContext>{ parameters, grantType, client };

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'c67f3504-c55b-426b-af08-b7f048e025ee', {
      request,
      context,
    });

    return context;
  }

  /**
   * Retrieves the Grant Type requested by the Client.
   *
   * @param parameters Parameters of the Token Request.
   * @param client Client requesting authorization.
   * @throws {UnauthorizedClientError} The Client is not allowed to request the provided Grant Type.
   * @returns Grant Type.
   */
  protected getGrantType(parameters: TokenRequest, client: Client): GrantType {
    this.logger.debug(`[${this.constructor.name}] Called getGrantType()`, '78e5a934-1a5a-4123-9cba-25397bc90ffe', {
      parameters,
      client_id: client.id,
    });

    const grantType = this.grantTypes.find((grantType) => grantType.name === parameters.grant_type)!;

    if (!client.grantTypes.includes(grantType.name)) {
      const error = new UnauthorizedClientError(
        `The Client is not allowed to request the Grant Type "${grantType.name}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to request the Grant Type "${grantType.name}"`,
        'dba5311f-567f-4934-bd2b-8ae387783cb7',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrantType()`, '0e606452-8fd9-4ee4-82e7-7558254c0e08', {
      parameters,
      client_id: client.id,
      grant_type: grantType.name,
    });

    return grantType;
  }
}
