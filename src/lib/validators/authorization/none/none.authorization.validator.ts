import { Injectable, InjectAll } from '@guarani/di';

import { NoneAuthorizationContext } from '../../../context/authorization/none/none.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../loggers/logger';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the None Authorization Validator.
 */
@Injectable()
export class NoneAuthorizationValidator extends AuthorizationValidator<NoneAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'none';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = [];

  /**
   * Instantiates a new None Authorization Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param responseTypes Response Types of the Identity Provider.
   * @param responseModes Response Modes of the Identity Provider.
   * @param displays Displays of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly dataAccess: DataAccess,
    protected override readonly scopeHandler: ScopeHandler,
    protected override readonly settings: Settings,
    @InjectAll(ResponseType) protected override readonly responseTypes: ResponseType[],
    @InjectAll(ResponseMode) protected override readonly responseModes: ResponseMode[],
    @InjectAll(Display) protected override readonly displays: Display[],
  ) {
    super(logger, dataAccess, scopeHandler, settings, responseTypes, responseModes, displays);
  }
}
