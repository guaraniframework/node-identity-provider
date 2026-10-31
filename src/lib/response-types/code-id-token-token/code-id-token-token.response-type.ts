import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CodeIdTokenTokenAuthorizationContext } from '../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenTokenAuthorizationResponse } from '../../responses/authorization/code-id-token-token/code-id-token-token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code & ID Token & Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Authorization Code
 * that has to be exchanged at the Token Endpoint of the Identity Provider for an Access Token, and
 * an Access token and ID Token directly from the Authorization Endpoint.
 *
 * The Authorization Code, Access Token and ID Token are returned at the Redirect URI of the Client.
 */
@Injectable()
export class CodeIdTokenTokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'code id_token token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new Code & ID Token & Token Response Type.
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
   * Creates and returns an Authorization Code, ID Token and Access Token Response to the Client.
   *
   * @param context Authorization Context.
   * @returns Authorization Response.
   */
  public async handle(context: CodeIdTokenTokenAuthorizationContext): Promise<CodeIdTokenTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '6fa921a5-f014-4539-aa99-a8e2ec2a657f', {
      context,
    });

    const { maxAge, nonce, parameters } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const { client, scopes, user } = consent;

    const [accessToken, authorizationCode, idToken] = await this.dataAccess.atomic(async () => {
      const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);
      const authorizationCode = await this.dataAccess.createAuthorizationCode(parameters, login, consent);
      const idToken = await this.idTokenHandler.generateIdToken(
        login,
        consent,
        removeNullishValues({
          maxAge: maxAge ?? undefined,
          nonce: nonce ?? undefined,
          accessToken,
          authorizationCode,
        } as GenerateIdTokenOptions),
      );

      return [accessToken, authorizationCode, idToken];
    });

    const response = createTokenResponse<CodeIdTokenTokenAuthorizationResponse>(accessToken);

    response.code = authorizationCode.id;
    response.id_token = idToken;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'ede42dd5-3307-412e-a681-480b49391c0c', {
      context,
      response,
    });

    return response;
  }
}
