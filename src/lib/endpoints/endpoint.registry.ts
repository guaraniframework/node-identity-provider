import { Constructor } from '@guarani/di';

import { AuthorizationEndpoint } from './authorization/authorization.endpoint';
import { InteractionEndpoint } from './interaction/interaction.endpoint';
import { Endpoint } from './endpoint';
import { EndpointName } from './endpoint-name.type';

/**
 * Endpoint Registry.
 */
export const endpointRegistry: Record<EndpointName, Constructor<Endpoint>> = {
  authorization: AuthorizationEndpoint,
  interaction: InteractionEndpoint,
};
