import { Constructor } from '@guarani/di';

import { GrantTypeName } from '../../grant-types/grant-type-name.type';
import { AuthorizationCodeTokenValidator } from './authorization-code/authorization-code.token.validator';
import { ClientCredentialsTokenValidator } from './client-credentials/client-credentials.token.validator';
import { JwtBearerTokenValidator } from './jwt-bearer/jwt-bearer.token.validator';
import { PasswordTokenValidator } from './password/password.token.validator';
import { RefreshTokenTokenValidator } from './refresh-token/refresh-token.token.validator';
import { TokenValidator } from './token.validator';

/**
 * Token Validator Registry of the Identity Provider.
 */
export const TOKEN_VALIDATOR_REGISTRY: Record<GrantTypeName, Constructor<TokenValidator>> = {
  authorization_code: AuthorizationCodeTokenValidator,
  client_credentials: ClientCredentialsTokenValidator,
  password: PasswordTokenValidator,
  refresh_token: RefreshTokenTokenValidator,
  'urn:ietf:params:oauth:grant-type:jwt-bearer': JwtBearerTokenValidator,
};
