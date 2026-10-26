import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CodeTokenAuthorizationContext } from '../../../context/authorization/code-token/code-token.authorization-request';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { CodeTokenAuthorizationRequest } from '../../../requests/authorization/code-token/code-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the Code & Token Authorization Validator.
 */
@Injectable()
export class CodeTokenAuthorizationValidator extends AuthorizationValidator<CodeTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'code token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new Code & Token Authorization Validator.
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
    @InjectAll(PKCE) protected readonly pkces: PKCE[],
  ) {
    super(logger, dataAccess, scopeHandler, settings, responseTypes, responseModes, displays);
  }

  /**
   * Validates the Http Authorization Request and returns the actors of the Authorization Context.
   *
   * @param request Http Request.
   * @throws {AccessDeniedError} The Client failed to obtain authorization.
   * @throws {InvalidClientError} The Client failed to authenticate.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidScopeError} The Client requested an invalid or unsupported Scope.
   * @throws {MethodNotAllowedError} The requested Http Request Method is not allowed.
   * @throws {UnauthorizedClientError} The Client is not authorized to make this Request.
   * @returns Authorization Context.
   */
  public override async validate(request: HttpRequest): Promise<CodeTokenAuthorizationContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '23d188c4-c5b7-4f51-a3ae-14ea135b5356', {
      request,
    });

    const context = await super.validate(request);

    const { parameters } = context;

    const codeChallenge = this.getCodeChallenge(parameters);
    const codeChallengeMethod = this.getCodeChallengeMethod(parameters);

    Object.assign<CodeTokenAuthorizationContext, Partial<CodeTokenAuthorizationContext>>(context, {
      codeChallenge,
      codeChallengeMethod,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '25d2616f-756f-441d-bcac-a897811b0d5e', {
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
  protected getCodeChallenge(parameters: CodeTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getCodeChallenge()`, '188f9307-4a4c-4697-8a7c-04cb511d5b8f', {
      parameters,
    });

    if (!isNonEmptyString(parameters.code_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge"`,
        '592795d1-a515-4678-bc22-f67af8b48e5c',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallenge = parameters.code_challenge;

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallenge()`,
      '7c02cd39-ca35-47f3-bc51-90ef7c537137',
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
  protected getCodeChallengeMethod(parameters: CodeTokenAuthorizationRequest): PKCE {
    this.logger.debug(
      `[${this.constructor.name}] Called getCodeChallengeMethod()`,
      '329093e3-3336-47a8-8d66-8a117c6aad88',
      { parameters },
    );

    if ('code_challenge_method' in parameters && !isNonEmptyString(parameters.code_challenge_method)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge_method"`,
        '636cfb68-5d28-425d-b93e-d7065f46f10a',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallengeMethodName = parameters.code_challenge_method ?? 'S256';
    const codeChallengeMethod = this.pkces.find((pkceMethod) => pkceMethod.name === codeChallengeMethodName);

    if (!(codeChallengeMethod instanceof PKCE)) {
      const error = new InvalidRequestError(`Unsupported Code Challenge Method "${codeChallengeMethodName}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported Code Challenge Method "${codeChallengeMethodName}"`,
        '8bcbcb76-f177-4cc5-89f9-fed0d15efe79',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallengeMethod()`,
      'd02df81e-a5d3-4a3a-8fc0-72b1aeda7f35',
      { parameters, code_challenge_method: codeChallengeMethod },
    );

    return codeChallengeMethod;
  }
}
