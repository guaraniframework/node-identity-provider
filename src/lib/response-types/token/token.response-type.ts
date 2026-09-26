import { Injectable } from '@guarani/di';

import { TokenAuthorizationContext } from '../../context/authorization/token/token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { TokenAuthorizationResponse } from '../../responses/authorization/token/token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Access Token
 * without the need for a second visit to the Identity Provider.
 *
 * The Access Token is returned at the Redirect URI of the Client.
 */
@Injectable()
export class TokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new Token Response Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
  ) {
    super();
  }

  /**
   * Creates and returns an Access Token Response to the Client.
   *
   * @param context Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Token Authorization Response.
   */
  public async handle(context: TokenAuthorizationContext): Promise<TokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '3bee0964-a167-4935-8d77-7210f20be2ec', {
      context,
    });

    const { client, scopes, user } = context.session!.grant!.consent!;

    const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);
    const response = createTokenResponse<TokenAuthorizationResponse>(accessToken);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'aca16c66-7827-4891-b039-ec7aedc407ec', {
      context,
      response,
    });

    return response;
  }
}
