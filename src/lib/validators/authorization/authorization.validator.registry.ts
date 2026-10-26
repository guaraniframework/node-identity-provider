import { Constructor } from '@guarani/di';

import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { CodeAuthorizationValidator } from './code/code.authorization.validator';
import { CodeIdTokenAuthorizationValidator } from './code-id-token/code-id-token.authorization.validator';
import { CodeIdTokenTokenAuthorizationValidator } from './code-id-token-token/code-id-token-token.authorization.validator';
import { CodeTokenAuthorizationValidator } from './code-token/code-token.authorization.validator';
import { IdTokenAuthorizationValidator } from './id-token/id-token.authorization.validator';
import { IdTokenTokenAuthorizationValidator } from './id-token-token/id-token-token.authorization.validator';
import { NoneAuthorizationValidator } from './none/none.authorization.validator';
import { TokenAuthorizationValidator } from './token/token.authorization.validator';
import { AuthorizationValidator } from './authorization.validator';

/**
 * Authorization Validator Registry of the Identity Provider.
 */
export const AUTHORIZATION_VALIDATOR_REGISTRY: Record<ResponseTypeName, Constructor<AuthorizationValidator>> = {
  code: CodeAuthorizationValidator,
  'code id_token': CodeIdTokenAuthorizationValidator,
  'code id_token token': CodeIdTokenTokenAuthorizationValidator,
  'code token': CodeTokenAuthorizationValidator,
  id_token: IdTokenAuthorizationValidator,
  'id_token token': IdTokenTokenAuthorizationValidator,
  none: NoneAuthorizationValidator,
  token: TokenAuthorizationValidator,
};
