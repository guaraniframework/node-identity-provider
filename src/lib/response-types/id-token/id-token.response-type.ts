import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IdTokenAuthorizationContext } from '../../context/authorization/id-token/id-token.authorization-context';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenAuthorizationResponse } from '../../responses/authorization/id-token/id-token.authorization-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the ID Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an ID Token
 * without the need for a second visit to the Identity Provider.
 *
 * The ID Token is returned at the Redirect URI of the Client.
 */
@Injectable()
export class IdTokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'id_token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new ID Token Response Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param idTokenHandler ID Token Handler of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
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
  public async handle(context: IdTokenAuthorizationContext): Promise<IdTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '77cfeb53-8cef-4533-b5f8-eb52ce5ddd37', {
      context,
    });

    const { maxAge, nonce } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const idToken = await this.idTokenHandler.generateIdToken(
      login,
      consent,
      removeNullishValues({ maxAge: maxAge ?? undefined, nonce: nonce ?? undefined } as GenerateIdTokenOptions),
    );

    const response: IdTokenAuthorizationResponse = { id_token: idToken };

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'f6a42fba-493d-40cf-bf17-6cd35f363d84', {
      context,
      response,
    });

    return response;
  }
}
