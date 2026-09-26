import { Inject, Injectable, InjectAll } from '@guarani/di';

import { NoneAuthorizationContext } from '../../../context/authorization/none/none.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../logger/logger';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { type Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { AuthorizationRequestValidator } from '../authorization-request.validator';

/**
 * Implementation of the None Authorization Request Validator.
 */
@Injectable()
export class NoneAuthorizationRequestValidator extends AuthorizationRequestValidator<NoneAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'none';

  /**
   * Instantiates a new None Authorization Request Validator.
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
}
