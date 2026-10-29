import { Constructor } from '@guarani/di';

import { ClientSecretBasicClientAuthentication } from './client-secret-basic/client-secret-basic.client-authentication';
import { ClientSecretJwtClientAuthentication } from './client-secret-jwt/client-secret-jwt.client-authentication';
import { ClientSecretPostClientAuthentication } from './client-secret-post/client-secret-post.client-authentication';
import { NoneClientAuthentication } from './none/none.client-authentication';
import { PrivateKeyJwtClientAuthentication } from './private-key-jwt/private-key-jwt.client-authentication';
import { ClientAuthentication } from './client-authentication';
import { ClientAuthenticationName } from './client-authentication-name.type';

/**
 * Client Authentication Methods Registry of the Identity Provider.
 */
export const CLIENT_AUTHENTICATION_REGISTRY: Record<ClientAuthenticationName, Constructor<ClientAuthentication>> = {
  client_secret_basic: ClientSecretBasicClientAuthentication,
  client_secret_jwt: ClientSecretJwtClientAuthentication,
  client_secret_post: ClientSecretPostClientAuthentication,
  none: NoneClientAuthentication,
  private_key_jwt: PrivateKeyJwtClientAuthentication,
};
