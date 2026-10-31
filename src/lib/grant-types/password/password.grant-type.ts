import { Injectable } from '@guarani/di';

import { PasswordTokenContext } from '../../context/token/password/password.token-context';
import { DataAccess } from '../../data-access/data-access';
import { RefreshToken } from '../../entities/refresh-token';
import { Logger } from '../../loggers/logger';
import { PasswordTokenResponse } from '../../responses/token/password/password.token-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { GrantType } from '../grant-type';
import { GrantTypeName } from '../grant-type-name.type';

/**
 * Implementation of the Resource Owner Password Credentials Grant Type.
 *
 * In this Grant Type the Client must obtain the username and password of the User
 * and present them as the Authorization Grant to the Identity Provider.
 */
@Injectable()
export class PasswordGrantType extends GrantType {
  /**
   * Name of the Grant Type.
   */
  public readonly name: GrantTypeName = 'password';

  /**
   * Instantiates a new Resource Owner Password Credentials Grant Type.
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
   * Creates a Resource Owner Password Credentials Token Response with the Access Token issued to the Client.
   *
   * In this flow the Identity Provider checks the username and password provided by the Client
   * on behalf of the User, issues an Access Token and, if allowed to the Client, a Refresh Token.
   *
   * @param context Resource Owner Password Credentials Token Context.
   * @returns Resource Owner Password Credentials Token Response.
   */
  public async handle(context: PasswordTokenContext): Promise<PasswordTokenResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'a9dd1b4d-7e59-4266-8f21-92e408bc2a51', {
      context,
    });

    const { client, scopes, user } = context;

    const [accessToken, refreshToken] = await this.dataAccess.atomic(async () => {
      const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);

      const refreshToken =
        typeof this.dataAccess.createRefreshToken === 'function' && client.grantTypes.includes('refresh_token')
          ? await this.dataAccess.createRefreshToken(scopes, client, user)
          : null;

      return [accessToken, refreshToken];
    });

    const response = createTokenResponse<PasswordTokenResponse>(accessToken);

    if (refreshToken instanceof RefreshToken) {
      response.refresh_token = refreshToken.id;
    }

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '9bbeb5ec-cc44-4903-9e26-55c066adc249', {
      context,
      response,
    });

    return response;
  }
}
