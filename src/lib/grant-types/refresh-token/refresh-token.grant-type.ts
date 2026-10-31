import { Injectable } from '@guarani/di';

import { RefreshTokenTokenContext } from '../../context/token/refresh-token/refresh-token.token-context';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../loggers/logger';
import { RefreshTokenTokenResponse } from '../../responses/token/refresh-token/refresh-token.token-response';
import { Settings } from '../../settings/settings';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { GrantType } from '../grant-type';
import { GrantTypeName } from '../grant-type-name.type';

/**
 * Implementation of the Refresh Token Grant Type.
 *
 * In this Grant Type the Client requests the Identity Provider for the issuance of a new Access Token
 * without the need to repeat the User Consent process.
 */
@Injectable()
export class RefreshTokenGrantType extends GrantType {
  /**
   * Name of the Grant Type.
   */
  public readonly name: GrantTypeName = 'refresh_token';

  /**
   * Instantiates a new Refresh Token Grant Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
  ) {
    super();

    if (this.settings.enableRefreshTokenRotation && typeof this.dataAccess.rotateRefreshToken !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.rotateRefreshToken".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.rotateRefreshToken"`,
        'e801b755-f734-47c2-b0f5-6aeebe7993c2',
        null,
        error,
      );

      throw error;
    }
  }

  /**
   * Creates a Refresh Token Token Response with the Access Token and Refresh Token issued to the Client.
   *
   * In this flow the Client uses the Refresh Token received by the Identity Provider as an Authorization Grant
   * to request a new Access Token without the need to trigger a new User Consent process.
   *
   * If the Refresh Token presented is valid, the Identity Provider issues a new Access Token.
   *
   * If Refresh Token Rotation is enabled, a new Refresh Token is issued and the provided Refresh Token is revoked.
   *
   * @param context Refresh Token Token Context.
   * @returns Refresh Token Token Response.
   */
  public async handle(context: RefreshTokenTokenContext): Promise<RefreshTokenTokenResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'bf77804e-9233-40c1-a7da-8906011f8a25', {
      context,
    });

    const {
      client,
      refreshToken: { user },
      scopes,
    } = context;

    // TODO: Add ID Token support.
    const [accessToken, refreshToken] = await this.dataAccess.atomic(async () => {
      let refreshToken = context.refreshToken;

      const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);

      if (this.settings.enableRefreshTokenRotation) {
        refreshToken = await this.dataAccess.rotateRefreshToken!(refreshToken);
      }

      return [accessToken, refreshToken];
    });

    const response = createTokenResponse<RefreshTokenTokenResponse>(accessToken);
    response.refresh_token = refreshToken.id;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '257bcc8c-fa4b-4068-91ba-b64c413fd478', {
      context,
      response,
    });

    return response;
  }
}
