import { Inject, Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { IdTokenTokenAuthorizationContext } from '../../../context/authorization/id-token-token/id-token-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../logger/logger';
import { IdTokenTokenAuthorizationRequest } from '../../../requests/authorization/id-token-token/id-token-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { type Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { AuthorizationRequestValidator } from '../authorization-request.validator';

/**
 * Implementation of the ID Token Token Authorization Request Validator.
 */
@Injectable()
export class IdTokenTokenAuthorizationRequestValidator extends AuthorizationRequestValidator<IdTokenTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'id_token token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected override readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new ID Token Token Authorization Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param scopeHandler Instance of the Scope Handler.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param responseTypes Response Types registered at the Identity Provider.
   * @param responseModes Response Modes registered at the Identity Provider.
   * @param displays Displays registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly scopeHandler: ScopeHandler,
    protected override readonly dataAccess: DataAccess,
    @Inject(SETTINGS) protected override readonly settings: Settings,
    @InjectAll(ResponseType) protected override readonly responseTypes: ResponseType[],
    @InjectAll(ResponseMode) protected override readonly responseModes: ResponseMode[],
    @InjectAll(Display) protected override readonly displays: Display[],
  ) {
    super(logger, scopeHandler, dataAccess, settings, responseTypes, responseModes, displays);
  }

  /**
   * Checks and returns the Nonce provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "nonce" is invalid.
   * @returns Nonce provided by the Client.
   */
  protected override getNonce(parameters: IdTokenTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, 'cc9b3fb7-e7fb-46d5-8d87-32e37f796188', {
      parameters,
    });

    if (!isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        'feba356d-1666-4803-b016-528e439582cd',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, 'ef501561-7eed-4acd-bc6e-3379263508f1', {
      parameters,
      nonce,
    });

    return nonce;
  }
}
