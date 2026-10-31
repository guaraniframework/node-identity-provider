import { Injectable } from '@guarani/di';

import { JwtBearerTokenContext } from '../../context/token/jwt-bearer/jwt-bearer.token-context';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../loggers/logger';
import { JwtBearerTokenResponse } from '../../responses/token/jwt-bearer/jwt-bearer.token-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { GrantType } from '../grant-type';
import { GrantTypeName } from '../grant-type-name.type';

/**
 * Implementation of the JWT Bearer Grant Type.
 *
 * In this Grant Type the Client provides a JSON Web Token Assertion as its Authorization Grant
 * and exchanges it for an Access Token.
 */
@Injectable()
export class JwtBearerGrantType extends GrantType {
  /**
   * Name of the Grant Type.
   */
  public readonly name: GrantTypeName = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

  /**
   * Instantiates a new JWT Bearer Grant Type.
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
   * Creates a JWT Bearer Access Token Response with the Access Token issued to the Client.
   *
   * In this flow, the Client presents a JSON Web Token Assertion signed with one of its JSON Web Keys
   * as an Authorization Grant for the Token Endpoint. Once the signature of the JSON Web Token is verified,
   * the Identity Provider issues an Access Token to the Client.
   *
   * It does not issue a Refresh Token, since the Client can generate a new JSON Web Token Assertion
   * and present it to the Token Endpoint without the need to reauthenticate the User.
   *
   * @param context JWT Bearer Token Context.
   * @returns JWT Bearer Token Response.
   */
  public async handle(context: JwtBearerTokenContext): Promise<JwtBearerTokenResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '53ab68dd-bad6-435a-a990-57acf6ff2b9c', {
      context,
    });

    const { client, scopes, user } = context;

    const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);
    const response = createTokenResponse<JwtBearerTokenResponse>(accessToken);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'aaef6e9c-c924-4d9b-bd75-0c25ac28a684', {
      context,
      response,
    });

    return response;
  }
}
