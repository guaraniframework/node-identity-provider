import { TokenTypeHint } from '../../types/token-type-hint.type';

/**
 * Parameters of the Revocation Request.
 */
export interface RevocationRequest extends NodeJS.Dict<string | string[]> {
  /**
   * Token Identifier.
   */
  readonly token: string;

  /**
   * Optional Token Type Hint.
   */
  readonly token_type_hint?: TokenTypeHint;
}
