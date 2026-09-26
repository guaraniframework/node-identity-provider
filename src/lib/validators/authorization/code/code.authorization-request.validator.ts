import { Inject, Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CodeAuthorizationContext } from '../../../context/authorization/code/code.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../logger/logger';
import { Pkce } from '../../../pkce/pkce';
import { CodeAuthorizationRequest } from '../../../requests/authorization/code/code.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { type Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { AuthorizationRequestValidator } from '../authorization-request.validator';

/**
 * Implementation of the Code Authorization Request Validator.
 */
@Injectable()
export class CodeAuthorizationRequestValidator<
  TContext extends CodeAuthorizationContext = CodeAuthorizationContext,
> extends AuthorizationRequestValidator<TContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'code';

  /**
   * Instantiates a new Code Authorization Request Validator.
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
    @InjectAll(Pkce) protected readonly pkces: Pkce[],
  ) {
    super(logger, scopeHandler, dataAccess, settings, responseTypes, responseModes, displays);
  }

  /**
   * Validates the Http Authorization Request and returns the actors of the Authorization Context.
   *
   * @param request Http Request.
   * @throws {AccessDeniedError} The Client failed to obtain authorization.
   * @throws {InvalidClientError} The Client failed to authenticate.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidScopeError} The Client requested an invalid or unsupported Scope.
   * @throws {UnauthorizedClientError} The Client is not authorized to make this Request.
   * @returns Authorization Context.
   */
  public override async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '6067ee3a-768c-4603-9ece-39942b144506', {
      request,
    });

    const context = await super.validate(request);

    const { parameters } = context;

    const codeChallenge = this.getCodeChallenge(parameters);
    const codeChallengeMethod = this.getCodeChallengeMethod(parameters);

    Object.assign<CodeAuthorizationContext, Partial<CodeAuthorizationContext>>(context, {
      codeChallenge,
      codeChallengeMethod,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '63363efb-6330-4b05-9805-348348388c69', {
      request,
      context,
    });

    return context;
  }

  /**
   * Retrieves the Code Challenge provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "code_challenge" is invalid.
   * @returns Code Challenge provided by the Client.
   */
  protected getCodeChallenge(parameters: CodeAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getCodeChallenge()`, '67d2dbc9-9b68-455b-bc67-e05b18749d4c', {
      parameters,
    });

    if (!isNonEmptyString(parameters.code_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge"`,
        'b3f1c7cb-74cc-480a-8d17-431a46d4f945',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallenge = parameters.code_challenge;

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallenge()`,
      '00680d07-ef6f-4321-8ba4-b9337c170350',
      { parameters, code_challenge: codeChallenge },
    );

    return codeChallenge;
  }

  /**
   * Retrieves the PKCE Method requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "code_challenge_method" is invalid.
   * @returns PKCE Method requested by the Client.
   */
  protected getCodeChallengeMethod(parameters: CodeAuthorizationRequest): Pkce {
    this.logger.debug(
      `[${this.constructor.name}] Called getCodeChallengeMethod()`,
      '56628249-71ce-4cba-b8eb-67be0c99beef',
      { parameters },
    );

    if ('code_challenge_method' in parameters && !isNonEmptyString(parameters.code_challenge_method)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge_method"`,
        'da4f691c-0b44-4f0e-b8b5-38c85eeb5526',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallengeMethodName = parameters.code_challenge_method ?? 'S256';
    const codeChallengeMethod = this.pkces.find((pkceMethod) => pkceMethod.name === codeChallengeMethodName);

    if (!(codeChallengeMethod instanceof Pkce)) {
      const error = new InvalidRequestError(`Unsupported code_challenge_method "${codeChallengeMethodName}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported code_challenge_method "${codeChallengeMethodName}"`,
        '815450a9-3c8c-400e-834c-734e696a838b',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallengeMethod()`,
      '5d1d4f02-13bb-4414-9a1c-f37cbdf98b2a',
      { parameters, code_challenge_method: codeChallengeMethod },
    );

    return codeChallengeMethod;
  }
}
