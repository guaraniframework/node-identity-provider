import { EndpointName } from '../endpoints/endpoint-name.type';
import { MethodNotAllowedError } from '../errors/method-not-allowed/method-not-allowed.error';
import { HttpRequest } from '../http/request/http-request';
import { HttpRequestMethod } from '../http/request/http-request-method.enum';
import { Logger } from '../logger/logger';

/**
 * The Request Validator class acts as the base for the Http Request Validators of the Identity Provider.
 *
 * Every Endpoint needs to have a Context containing the data resulting from the parsing of its Parameters,
 * and it also allows additional entities to be attached in order to proceed with the flow of the Endpoint.
 */
export abstract class RequestValidator<TContext extends NodeJS.Dict<any>> {
  /**
   * Name of the Endpoint that uses this Request Validator.
   */
  public abstract readonly endpoint: EndpointName;

  /**
   * Http Request Methods supported by the Request Validator.
   */
  public abstract readonly supportedHttpRequestMethods: HttpRequestMethod[];

  /**
   * Instantiates a new Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(protected readonly logger: Logger) {}

  /**
   * Validates the Http Request and returns the actors of the Request Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} Failed to validate the Http Request.
   * @returns Request Context.
   */
  public abstract validate(request: HttpRequest): Promise<TContext>;

  /**
   * Checks if the Error Endpoint supports the requested Http Request Method.
   *
   * @param request Http Request.
   * @throws {MethodNotAllowedError} The requested Http Request Method is not allowed.
   */
  protected checkHttpRequestMethod(request: HttpRequest): void {
    this.logger.debug(
      `[${this.constructor.name}] Called checkHttpRequestMethod()`,
      '225f5fa1-4b7c-4703-a20c-0519645a9481',
      { request },
    );

    if (!this.supportedHttpRequestMethods.includes(request.method)) {
      const endpointName = this.endpoint
        .replaceAll('_', ' ')
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.substring(1))
        .join(' ');

      const method = request.method.toUpperCase();

      const error = new MethodNotAllowedError(
        `The ${endpointName} Endpoint does not support the Http Request Method "${method}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] The ${endpointName} Endpoint does not support the Http Request Method "${method}"`,
        '817c032b-b400-43cd-8c7a-666ab335236c',
        { request },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed checkHttpRequestMethod()`,
      'df44dd89-6bcc-4471-ad92-5bcdda519f44',
      { request },
    );
  }
}
