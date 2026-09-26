import { Injectable } from '@guarani/di';

import { CodeTokenAuthorizationContext } from '../../context/authorization/code-token/code-token.authorization-request';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeTokenAuthorizationResponse } from '../../responses/authorization/code-token/code-token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Authorization Code
 * that has to be exchanged at the Token Endpoint of the Identity Provider for an Access Token, and
 * an Access token directly from the Authorization Endpoint.
 *
 * The Authorization Code and Access Token are returned at the Redirect URI of the Client.
 */
@Injectable()
export class CodeTokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'code token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new Code Token Response Type.
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
   * Creates and returns an Authorization Code and Access Token Response to the Client.
   *
   * @param context Code Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Code Token Authorization Response.
   */
  public async handle(context: CodeTokenAuthorizationContext): Promise<CodeTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '9f366a6e-267e-4830-b3bc-1ca9ec8c77ee', {
      context,
    });

    const parameters = context.parameters;
    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const { client, scopes } = consent;

    const [accessToken, authorizationCode] = await this.dataAccess.createAccessTokenAndAuthorizationCode(
      parameters,
      scopes,
      client,
      login,
      consent,
    );

    const response = createTokenResponse<CodeTokenAuthorizationResponse>(accessToken);
    response.code = authorizationCode.id;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '66960b5c-90fa-425d-a4ec-44aae46bbdf9', {
      context,
      response,
    });

    return response;
  }
}
