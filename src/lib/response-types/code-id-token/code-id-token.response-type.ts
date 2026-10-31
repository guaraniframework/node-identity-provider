import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CodeIdTokenAuthorizationContext } from '../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenAuthorizationResponse } from '../../responses/authorization/code-id-token/code-id-token.authorization-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code & ID Token Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Authorization Code
 * that has to be exchanged at the Token Endpoint of the Identity Provider for an Access Token, and
 * an ID Token directly from the Authorization Endpoint.
 *
 * The Authorization Code and ID Token are returned at the Redirect URI of the Client.
 */
@Injectable()
export class CodeIdTokenResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'code id_token';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'fragment';

  /**
   * Instantiates a new Code & ID Token Response Type.
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
   * Creates and returns an Authorization Code and ID Token Response to the Client.
   *
   * @param context Authorization Context.
   * @returns Authorization Response.
   */
  public async handle(context: CodeIdTokenAuthorizationContext): Promise<CodeIdTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '02f7632d-331d-46a5-936e-2a69734bd46c', {
      context,
    });

    const { maxAge, nonce, parameters } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const [authorizationCode, idToken] = await this.dataAccess.atomic(async () => {
      const authorizationCode = await this.dataAccess.createAuthorizationCode(parameters, login, consent);
      const idToken = await this.idTokenHandler.generateIdToken(
        login,
        consent,
        removeNullishValues({
          maxAge: maxAge ?? undefined,
          nonce: nonce ?? undefined,
          authorizationCode,
        } as GenerateIdTokenOptions),
      );

      return [authorizationCode, idToken];
    });

    const response: CodeIdTokenAuthorizationResponse = { code: authorizationCode.id, id_token: idToken };

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'e917d568-63c9-4825-a2ac-cc091c79d58d', {
      context,
      response,
    });

    return response;
  }
}
