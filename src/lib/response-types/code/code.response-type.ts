import { Injectable } from '@guarani/di';

import { CodeAuthorizationContext } from '../../context/authorization/code/code.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeAuthorizationResponse } from '../../responses/authorization/code/code.authorization-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the Code Response Type.
 *
 * In this Response Type the Client obtains Consent from the User and receives an Authorization Code
 * that has to be exchanged at the Token Endpoint of the Identity Provider for an Access Token.
 *
 * The Authorization Code is returned at the Redirect URI of the Client.
 */
@Injectable()
export class CodeResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'code';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'query';

  /**
   * Instantiates a new Token Response Type.
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
   * Creates the Authorization Response with the Authorization Grant used by the Client on behalf of the End User.
   *
   * In this part of the Authorization process the Identity Provider checks the Scopes requested by the Client and,
   * if authorized by the User, issues an Authorization Code as a temporary Authorization Grant to the Client.
   *
   * The format of the Authorization Response is as follows:
   *
   * ```json
   *   {
   *     "code": "XUFJGWdzVCx8K153POB1XasJB-gUjeAj",
   *     "state": "VGLgcR2TLMhguh7t"
   *   }
   * ```
   *
   * Both the Code Challenge and the PKCE used by the Client to generate the PKCE Code Challenge are registered
   * at the application's storage together with the issued Authorization Code for verification at the Token Endpoint.
   *
   * @param context Code Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Code Authorization Response.
   */
  public async handle(context: CodeAuthorizationContext): Promise<CodeAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '34a9598e-ada6-47d7-aaa0-0f14bf2daf0f', {
      context,
    });

    const parameters = context.parameters;
    const login = context.session!.activeLogin!;
    const consent = context.session!.grant!.consent!;

    const authorizationCode = await this.dataAccess.createAuthorizationCode(parameters, login, consent);
    const response: CodeAuthorizationResponse = { code: authorizationCode.id };

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'e2a1dcf7-551f-40fb-a723-a5592d1e9041', {
      context,
      response,
    });

    return response;
  }
}
