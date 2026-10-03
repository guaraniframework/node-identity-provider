import { Constructor } from '@guarani/di';

import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { CodeAuthorizationRequestValidator } from './code/code.authorization-request.validator';
import { CodeIdTokenAuthorizationRequestValidator } from './code-id-token/code-id-token.authorization-request.validator';
import { CodeIdTokenTokenAuthorizationRequestValidator } from './code-id-token-token/code-id-token-token.authorization-request.validator';
import { CodeTokenAuthorizationRequestValidator } from './code-token/code-token.authorization-request.validator';
import { IdTokenAuthorizationRequestValidator } from './id-token/id-token.authorization-request.validator';
import { IdTokenTokenAuthorizationRequestValidator } from './id-token-token/id-token-token.authorization-request.validator';
import { NoneAuthorizationRequestValidator } from './none/none.authorization-request.validator';
import { TokenAuthorizationRequestValidator } from './token/token.authorization-request.validator';
import { AuthorizationRequestValidator } from './authorization-request.validator';

/**
 * Authorization Request Validator Registry.
 */
export const authorizationRequestValidatorRegistry: Record<
  ResponseTypeName,
  Constructor<AuthorizationRequestValidator>
> = {
  'code id_token token': CodeIdTokenTokenAuthorizationRequestValidator,
  'code id_token': CodeIdTokenAuthorizationRequestValidator,
  'code token': CodeTokenAuthorizationRequestValidator,
  'id_token token': IdTokenTokenAuthorizationRequestValidator,
  code: CodeAuthorizationRequestValidator,
  id_token: IdTokenAuthorizationRequestValidator,
  none: NoneAuthorizationRequestValidator,
  token: TokenAuthorizationRequestValidator,
};
