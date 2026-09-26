import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CodeIdTokenAuthorizationContext } from '../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { GenerateIdTokenOptions } from '../../handlers/id-token/generate-id-token.options';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenAuthorizationResponse } from '../../responses/authorization/code-id-token.authorization-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code ID Token Response Type.
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
   * Instantiates a new Code ID Token Response Type.
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
   * Creates and returns an Authorization Code and ID Token Response to the Client.
   *
   * @param context Code ID Token Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Code ID Token Authorization Response.
   */
  public async handle(context: CodeIdTokenAuthorizationContext): Promise<CodeIdTokenAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '3e156477-4a68-4e36-9fcb-cb01fd919e4c', {
      context,
    });

    const { maxAge, nonce, parameters } = context;

    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    if (!consent.scopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required scope "openid"`,
        '6fe15bed-518f-4b0a-a2cf-52771a8ed052',
        { context },
        error,
      );

      throw error;
    }

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

    const response: CodeIdTokenAuthorizationResponse = { code: authorizationCode.id, id_token: idToken };

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '6b073f94-fd4c-49ea-91c8-fe3511562746', {
      context,
      response,
    });

    return response;
  }
}
