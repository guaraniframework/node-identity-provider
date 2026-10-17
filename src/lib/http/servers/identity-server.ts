import { Logger } from '../../logger/logger';
import { IdentityProvider } from '../identity-provider';
import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpRouter } from '../router/http-router';

/**
 * The Identity Server allows Web Servers to interface with the Endpoints of the Identity Provider via the Http Router,
 * which maps the Handlers of the Identity Provider to Paths with the supported Http Requested Methods for each Endpoint.
 */
export abstract class IdentityServer {
  /**
   * Instantiates a new Identity Server.
   *
   * @param logger Logger of the Identity Provider.
   * @param provider Identity Provider.
   * @param router Http Router of the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly provider: IdentityProvider,
    protected readonly router: HttpRouter,
  ) {}

  /**
   * Defines the Endpoints of the Http Router based on the Handlers of the Identity Provider.
   */
  public bootstrap(): void {
    this.logger.debug(`[${this.constructor.name}] Called bootstrap()`, '6a386052-4e54-44be-94ca-1e471c5c8676', null);

    this.router.addEndpoint('error', {
      path: '/oidc/error',
      routes: [
        { method: HttpRequestMethod.GET, handler: this.provider.error },
        { method: HttpRequestMethod.POST, handler: this.provider.error },
      ],
    });

    this.logger.debug(`[${this.constructor.name}] Completed bootstrap()`, 'fec753f3-ca37-421b-9132-bd10b537905a', null);
  }
}
