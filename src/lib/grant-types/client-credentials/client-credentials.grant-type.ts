import { Injectable } from '@guarani/di';

import { ClientCredentialsTokenContext } from '../../context/token/client-credentials/client-credentials.token-context';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../loggers/logger';
import { ClientCredentialsTokenResponse } from '../../responses/token/client-credentials/client-credentials.token-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { GrantType } from '../grant-type';
import { GrantTypeName } from '../grant-type-name.type';

/**
 * Implementation of the Client Credentials Grant Type.
 *
 * In this Grant Type the Client exchanges its Credentials for an Access Token.
 *
 * At the most basic level, authenticating with the Token Endpoint is sufficient for the issuance of an Access Token.
 * A Refresh Token is not issued.
 */
@Injectable()
export class ClientCredentialsGrantType extends GrantType {
  /**
   * Name of the Grant Type.
   */
  public readonly name: GrantTypeName = 'client_credentials';

  /**
   * Instantiates a new Client Credentials Grant Type.
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
   * Creates a Client Credentials Token Response with the Access Token issued to the Client.
   *
   * In this flow the Identity Provider checks the Credentials of the Client and, if valid, issues an Access Token.
   * A Refresh Token is not issued.
   *
   * Since the Client asks for an Access Token on behalf of itself, it is recommended for the Access Token to have a small lifetime.
   *
   * @param context Client Credentials Token Context.
   * @returns Client Credentials Token Response.
   */
  public async handle(context: ClientCredentialsTokenContext): Promise<ClientCredentialsTokenResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '8f2a4dab-7cb6-4c10-a2bd-8e0acfdfcc8b', {
      context,
    });

    const { client, scopes } = context;

    const accessToken = await this.dataAccess.createAccessToken(scopes, client, null);
    const response = createTokenResponse<ClientCredentialsTokenResponse>(accessToken);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '44a96591-0413-43ca-8abe-7d36b129335e', {
      context,
      response,
    });

    return response;
  }
}
