import { Constructor } from '@guarani/di';

import { CodeResponseType } from './code/code.response-type';
import { CodeIdTokenResponseType } from './code-id-token/code-id-token.response-type';
import { CodeIdTokenTokenResponseType } from './code-id-token-token/code-id-token-token.response-type';
import { CodeTokenResponseType } from './code-token/code-token.response-type';
import { IdTokenResponseType } from './id-token/id-token.response-type';
import { IdTokenTokenResponseType } from './id-token-token/id-token-token.response-type';
import { NoneResponseType } from './none/none.response-type';
import { TokenResponseType } from './token/token.response-type';
import { ResponseType } from './response-type';
import { ResponseTypeName } from './response-type-name.type';

/**
 * Response Type Registry.
 */
export const responseTypeRegistry: Record<ResponseTypeName, Constructor<ResponseType>> = {
  'code id_token token': CodeIdTokenTokenResponseType,
  'code id_token': CodeIdTokenResponseType,
  'code token': CodeTokenResponseType,
  'id_token token': IdTokenTokenResponseType,
  code: CodeResponseType,
  id_token: IdTokenResponseType,
  none: NoneResponseType,
  token: TokenResponseType,
};
