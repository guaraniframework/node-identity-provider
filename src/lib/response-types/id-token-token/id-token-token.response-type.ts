import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IdTokenTokenAuthorizationContext } from '../../context/authorization/id-token-token/id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenTokenAuthorizationResponse } from '../../responses/authorization/id-token-token/id-token-token.authorization-response';
import { createTokenResponse } from '../../utils/create-token-response/create-token-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the ID Token Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Access Token
 * and ID Token without the need for a second visit to the Identity Provider.
 *
 * The Access Token and ID Token are returned at the Redirect URI of the Client.
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
   * Instantiates a new ID Token Token Response Type.
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
   * Creates and returns an ID Token Token Response to the Client.
   *
   * @param context ID Token Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns ID Token Token Authorization Response.
   */
  public async handle(context: IdTokenTokenAuthorizationContext): Promise<IdTokenTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'f5e1d54d-a2db-434b-8aa3-fd782c9cc529', {
      context,
    });

    const { maxAge, nonce } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const { client, scopes, user } = consent!;

    if (!consent.scopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required scope "openid"`,
        'f27a5dd8-dffe-40bd-9721-5af7a1300e29',
        { context },
        error,
      );

      throw error;
    }

    const accessToken = await this.dataAccess.createAccessToken(scopes, client, user);

    const idToken = await this.idTokenHandler.generateIdToken(
      login,
      consent,
      removeNullishValues({
        maxAge: maxAge ?? undefined,
        nonce: nonce ?? undefined,
        accessToken,
      } as GenerateIdTokenOptions),
    );

    const response = createTokenResponse<IdTokenTokenAuthorizationResponse>(accessToken);
    response.id_token = idToken;

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '2a0cc5ba-9a00-4cda-8f81-6d8d5a7ac335', {
      context,
      response,
    });

    return response;
  }
}
