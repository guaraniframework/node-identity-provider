import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CodeIdTokenTokenAuthorizationContext } from '../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenTokenAuthorizationResponse } from '../../responses/authorization/code-id-token-token/code-id-token-token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code ID Token Token Response Type.
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
   * Instantiates a new Code ID Token Token Response Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param idTokenHandler Instance of the ID Token Handler.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly idTokenHandler: IdTokenHandler,
    private readonly dataAccess: DataAccess,
  ) {
    super();
  }

  /**
   * Creates and returns an Authorization Code, Access Token and ID Token Response to the Client.
   *
   * @param context Code ID Token Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Code ID Token Token Authorization Response.
   */
  public async handle(context: CodeIdTokenTokenAuthorizationContext): Promise<CodeIdTokenTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '1a03e197-2b75-48f7-a504-afff794e91df', {
      context,
    });

    const { maxAge, nonce, parameters } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const { client, scopes } = consent;

    if (!consent.scopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required scope "openid"`,
        'dc5c6e1f-8ae2-4369-a5e3-dadcebdb4694',
        { context },
        error,
      );

      throw error;
    }

    const [accessToken, authorizationCode] = await this.dataAccess.createAccessTokenAndAuthorizationCode(
      parameters,
      scopes,
      client,
      login,
      consent,
    );

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

    const response = createTokenResponse<CodeIdTokenTokenAuthorizationResponse>(accessToken);

    response.code = authorizationCode.id;
    response.id_token = idToken;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '42aa169a-932e-4317-ac98-a144aeed26c4', {
      context,
      response,
    });

    return response;
  }
}
