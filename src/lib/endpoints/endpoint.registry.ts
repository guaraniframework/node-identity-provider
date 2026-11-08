import { Constructor } from '@guarani/di';

import { AuthorizationEndpoint } from './authorization/authorization.endpoint';
import { DiscoveryEndpoint } from './discovery/discovery.endpoint';
import { InteractionEndpoint } from './interaction/interaction.endpoint';
import { RevocationEndpoint } from './revocation/revocation.endpoint';
import { TokenEndpoint } from './token/token.endpoint';
import { Endpoint } from './endpoint';
import { EndpointName } from './endpoint-name.type';

/**
 * Endpoint Registry of the Identity Provider.
 */
export const ENDPOINT_REGISTRY: Record<EndpointName, Constructor<Endpoint>> = {
  authorization: AuthorizationEndpoint,
  discovery: DiscoveryEndpoint,
  interaction: InteractionEndpoint,
  revocation: RevocationEndpoint,
  token: TokenEndpoint,
};
