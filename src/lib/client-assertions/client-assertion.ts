import { ClientAuthentication } from '../client-authentication/client-authentication';
import { HttpRequest } from '../http/request/http-request';
import { Logger } from '../loggers/logger';
import { ClientAssertionName } from './client-assertion-name.type';

/**
 * The Client Assertion is used to authenticate a Client by using an Assertion about itself
 * rather than by providing its credentials during the Request.
 */
export abstract class ClientAssertion extends ClientAuthentication {
  /**
   * Name of the Client Assertion.
   */
  public abstract readonly clientAssertionType: ClientAssertionName;

  /**
   * Instantiates a new Client Assertion.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(protected readonly logger: Logger) {
    super();
  }

  /**
   * Checks if the Client Authentication Method has been requested by the Client.
   *
   * @param request Http Request.
   * @returns Whether or not the Client Authentication Method has been requested.
   */
  public hasBeenRequested(request: HttpRequest): boolean {
    this.logger.debug(`[${this.constructor.name}] Called hasBeenRequested()`, 'e9994da2-7145-424b-bea4-85df04029eee', {
      request,
    });

    const parameters = request.form<NodeJS.Dict<string | string[]>>();

    const result =
      'client_assertion_type' in parameters &&
      parameters['client_assertion_type'] === this.clientAssertionType &&
      'client_assertion' in parameters;

    this.logger.debug(
      `[${this.constructor.name}] Completed hasBeenRequested()`,
      'db2b3573-4737-4231-9521-d0407d838bee',
      { request, result },
    );

    return result;
  }
}
