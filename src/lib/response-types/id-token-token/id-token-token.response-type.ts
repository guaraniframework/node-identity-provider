import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IdTokenTokenAuthorizationContext } from '../../context/authorization/id-token-token/id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenTokenAuthorizationResponse } from '../../responses/authorization/id-token-token/id-token-token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the ID Token & Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an ID Token and Access Token
 * without the need for a second visit to the Identity Provider.
 *
 * The ID Token and Access Token are returned at the Redirect URI of the Client.
 */
@Injectable()
export class IdTokenTokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'id_token token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new ID Token & Token Response Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param idTokenHandler ID Token Handler of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly idTokenHandler: IdTokenHandler,
  ) {
    super();
  }

  /**
   * Creates the ID Token Authorization Response with an Access Token to be used by the Client on behalf of the User.
   *
   * @param context Authorization Context.
   * @returns Authorization Response.
   */
  public async handle(context: IdTokenTokenAuthorizationContext): Promise<IdTokenTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '0efbb644-c6a6-491a-92b9-7c897af32e32', {
      context,
    });

    const { maxAge, nonce } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const { client, scopes, user } = consent;

    const [accessToken, idToken] = await this.dataAccess.atomic(async () => {
      const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);
      const idToken = await this.idTokenHandler.generateIdToken(
        login,
        consent,
        removeNullishValues({ maxAge: maxAge ?? undefined, nonce: nonce ?? undefined } as GenerateIdTokenOptions),
      );

      return [accessToken, idToken];
    });

    const response = createTokenResponse<IdTokenTokenAuthorizationResponse>(accessToken);
    response.id_token = idToken;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '0151fb29-98be-4e0a-9678-466023e4ee03', {
      context,
      response,
    });

    return response;
  }
}
