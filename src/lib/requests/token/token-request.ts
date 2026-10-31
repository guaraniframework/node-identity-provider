import { GrantTypeName } from '../../grant-types/grant-type-name.type';

/**
 * Parameters of the Token Request.
 */
export interface TokenRequest<TGrantType extends GrantTypeName = GrantTypeName> extends NodeJS.Dict<string | string[]> {
  /**
   * Grant Type requested by the Client.
   */
  readonly grant_type: TGrantType;
}
