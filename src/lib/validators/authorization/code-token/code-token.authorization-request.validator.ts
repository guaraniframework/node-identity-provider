import { Inject, Injectable, InjectAll } from '@guarani/di';

import { CodeTokenAuthorizationContext } from '../../../context/authorization/code-token/code-token.authorization-request';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../logger/logger';
import { Pkce } from '../../../pkce/pkce';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { type Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { CodeAuthorizationRequestValidator } from '../code/code.authorization-request.validator';

/**
 * Implementation of the Code Token Authorization Request Validator.
 */
@Injectable()
export class CodeTokenAuthorizationRequestValidator extends CodeAuthorizationRequestValidator<CodeTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public override readonly name: ResponseTypeName = 'code token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected override readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new Code Token Authorization Request Validator.
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
}
