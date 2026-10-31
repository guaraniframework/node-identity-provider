import { Constructor } from '@guarani/di';

import { AuthorizationCodeGrantType } from './authorization-code/authorization-code.grant-type';
import { ClientCredentialsGrantType } from './client-credentials/client-credentials.grant-type';
import { JwtBearerGrantType } from './jwt-bearer/jwt-bearer.grant-type';
import { PasswordGrantType } from './password/password.grant-type';
import { RefreshTokenGrantType } from './refresh-token/refresh-token.grant-type';
import { GrantType } from './grant-type';
import { GrantTypeName } from './grant-type-name.type';

/**
 * Grant Type Registry of the Identity Provider.
 */
export const GRANT_TYPE_REGISTRY: Record<GrantTypeName, Constructor<GrantType>> = {
  authorization_code: AuthorizationCodeGrantType,
  client_credentials: ClientCredentialsGrantType,
  password: PasswordGrantType,
  refresh_token: RefreshTokenGrantType,
  'urn:ietf:params:oauth:grant-type:jwt-bearer': JwtBearerGrantType,
};
