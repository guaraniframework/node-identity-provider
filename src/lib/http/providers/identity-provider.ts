import { Endpoint } from '../../endpoints/endpoint';
import { Logger } from '../../loggers/logger';

/**
 * The Identity Provider allows Web Servers to interface with its Endpoints.
 */
export abstract class IdentityProvider {
  /**
   * Instantiates a new Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    public readonly endpoints: Endpoint[],
  ) {}
}
