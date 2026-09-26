import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IdTokenAuthorizationContext } from '../../context/authorization/id-token/id-token.authorization-context';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
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
   * @param idTokenHandler Instance of the ID Token Handler.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly idTokenHandler: IdTokenHandler,
  ) {
    super();
  }

  /**
   * Creates and returns an ID Token Response to the Client.
   *
   * @param context ID Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns ID Token Authorization Response.
   */
  public async handle(context: IdTokenAuthorizationContext): Promise<IdTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '3bee0964-a167-4935-8d77-7210f20be2ec', {
      context,
    });

    const { maxAge, nonce } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    if (!consent.scopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required scope "openid"`,
        'a39eab70-3a5b-46f4-85ba-e0d15923b18c',
        { context },
        error,
      );

      throw error;
    }

    const idToken = await this.idTokenHandler.generateIdToken(
      login,
      consent,
      removeNullishValues({ maxAge: maxAge ?? undefined, nonce: nonce ?? undefined } as GenerateIdTokenOptions),
    );

    const response: IdTokenAuthorizationResponse = { id_token: idToken };

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'aca16c66-7827-4891-b039-ec7aedc407ec', {
      context,
      response,
    });

    return response;
  }
}
