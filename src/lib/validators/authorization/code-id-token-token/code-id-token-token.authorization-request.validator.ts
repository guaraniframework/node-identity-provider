import { Inject, Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CodeIdTokenTokenAuthorizationContext } from '../../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../logger/logger';
import { Pkce } from '../../../pkce/pkce';
import { CodeIdTokenTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token-token/code-id-token-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { type Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { CodeAuthorizationRequestValidator } from '../code/code.authorization-request.validator';

/**
 * Implementation of the Code ID Token Token Authorization Request Validator.
 */
@Injectable()
export class CodeIdTokenTokenAuthorizationRequestValidator extends CodeAuthorizationRequestValidator<CodeIdTokenTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public override readonly name: ResponseTypeName = 'code id_token token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected override readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new Code ID Token Token Authorization Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param scopeHandler Instance of the Scope Handler.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param responseTypes Response Types registered at the Identity Provider.
   * @param responseModes Response Modes registered at the Identity Provider.
   * @param displays Displays registered at the Identity Provider.
   * @param pkces PKCEs registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly scopeHandler: ScopeHandler,
    protected override readonly dataAccess: DataAccess,
    @Inject(SETTINGS) protected override readonly settings: Settings,
    @InjectAll(ResponseType) protected override readonly responseTypes: ResponseType[],
    @InjectAll(ResponseMode) protected override readonly responseModes: ResponseMode[],
    @InjectAll(Display) protected override readonly displays: Display[],
    @InjectAll(Pkce) protected override readonly pkces: Pkce[],
  ) {
    super(logger, scopeHandler, dataAccess, settings, responseTypes, responseModes, displays, pkces);
  }

  /**
   * Checks and returns the Nonce provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "nonce" is invalid.
   * @returns Nonce provided by the Client.
   */
  protected override getNonce(parameters: CodeIdTokenTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, '0e75fdb0-600b-4337-be19-d3d20dc47da0', {
      parameters,
    });

    if (!isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        '8dd4d5d5-71bd-4aaf-bebb-4d9d561e42a6',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, '1ad0691f-1c05-4e38-80fa-d56bc79dd9fb', {
      parameters,
      nonce,
    });

    return nonce;
  }
}
