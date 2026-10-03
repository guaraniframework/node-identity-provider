import { Constructor } from '@guarani/di';

import { ClientSecretBasicClientAuthentication } from './client-secret-basic/client-secret-basic.client-authentication';
import { ClientSecretPostClientAuthentication } from './client-secret-post/client-secret-post.client-authentication';
import { NoneClientAuthentication } from './none/none.client-authentication';
import { ClientAuthentication } from './client-authentication';
import { ClientAuthenticationName } from './client-authentication-name.type';

/**
 * Client Authentication Methods Registry.
 */
export const clientAuthenticationRegistry: Record<ClientAuthenticationName, Constructor<ClientAuthentication>> = {
  client_secret_basic: ClientSecretBasicClientAuthentication,
  client_secret_post: ClientSecretPostClientAuthentication,
  none: NoneClientAuthentication,
};
