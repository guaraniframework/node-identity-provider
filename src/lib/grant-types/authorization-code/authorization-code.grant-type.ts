import { Injectable, Optional } from '@guarani/di';

import { AuthorizationCodeTokenContext } from '../../context/token/authorization-code/authorization-code.token-context';
import { DataAccess } from '../../data-access/data-access';
import { RefreshToken } from '../../entities/refresh-token';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { AuthorizationCodeTokenResponse } from '../../responses/token/authorization-code/authorization-code.token-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { GrantType } from '../grant-type';
import { GrantTypeName } from '../grant-type-name.type';

/**
 * Implementation of the Authorization Code Grant Type.
 *
 * In this Grant Type the Client uses the Authorization Code obtained at the Authorization Endpoint
 * and exchanges it for an Access Token and optional Refresh Token and ID Token.
 *
 * This implementation uses PKCE by default, and enforces its use every time.
 */
@Injectable()
export class AuthorizationCodeGrantType extends GrantType {
  /**
   * Name of the Grant Type.
   */
  public readonly name: GrantTypeName = 'authorization_code';

  /**
   * Instantiates a new Authorization Code Grant Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    @Optional() private readonly idTokenHandler?: IdTokenHandler,
  ) {
    super();
  }

  /**
   * Creates an Authorization Code Token Response with the Access Token issued to the Client.
   *
   * In this part of the Authorization process the Identity Provider checks the validity of the Authorization Code
   * provided by the Client against the Authorization Code metadata saved at the application's storage.
   *
   * If the Client presented a valid Authorization Code that was granted to itself, and if it presented the correct PKCE Code Verifier
   * that matches the Code Challenge presented at the Authorization Endpoint, the Identity Provider issues an Access Token and,
   * if allowed to the Client, a Refresh Token and an ID Token.
   *
   * @param context Authorization Code Token Context.
   * @returns Authorization Code Token Response.
   */
  public async handle(context: AuthorizationCodeTokenContext): Promise<AuthorizationCodeTokenResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '89f3b67e-5ec3-4548-a3a9-880e2a9ebcf4', {
      context,
    });

    const { authorizationCode, client } = context;

    const { consent, login } = authorizationCode;
    const { scopes, user } = consent;

    const [accessToken, refreshToken, idToken] = await this.dataAccess.atomic(async () => {
      const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);

      const refreshToken =
        typeof this.dataAccess.createRefreshToken === 'function' && client.grantTypes.includes('refresh_token')
          ? await this.dataAccess.createRefreshToken(scopes, client, user)
          : null;

      const idToken =
        typeof this.idTokenHandler !== 'undefined' && scopes.some((scope) => scope.name === 'openid')
          ? await this.idTokenHandler!.generateIdToken(login, consent, {
              accessToken,
              authorizationCode,
              maxAge:
                typeof authorizationCode.parameters.max_age === 'string'
                  ? Number.parseInt(authorizationCode.parameters.max_age, 10)
                  : undefined!,
              nonce: authorizationCode.parameters.nonce ?? undefined!,
            })
          : null;

      await this.dataAccess.revokeAuthorizationCode(authorizationCode);

      return [accessToken, refreshToken, idToken];
    });

    const response = createTokenResponse<AuthorizationCodeTokenResponse>(accessToken);

    if (refreshToken instanceof RefreshToken) {
      response.refresh_token = refreshToken.id;
    }

    if (typeof idToken === 'string') {
      response.id_token = idToken;
    }

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '88829f8b-6dcf-40a7-a706-36b2f5befe10', {
      context,
      response,
    });

    return response;
  }
}
