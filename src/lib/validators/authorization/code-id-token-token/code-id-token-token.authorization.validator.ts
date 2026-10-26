import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CodeIdTokenTokenAuthorizationContext } from '../../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { CodeIdTokenTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token-token/code-id-token-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the Code & ID Token & Token Authorization Validator.
 */
@Injectable()
export class CodeIdTokenTokenAuthorizationValidator extends AuthorizationValidator<CodeIdTokenTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'code id_token token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new Code & ID Token & Token Authorization Validator.
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
  public override async validate(request: HttpRequest): Promise<CodeIdTokenTokenAuthorizationContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '6fd747e2-a8d8-497b-b4a0-f19005d3b66a', {
      request,
    });

    const context = await super.validate(request);

    const { parameters } = context;

    const codeChallenge = this.getCodeChallenge(parameters);
    const codeChallengeMethod = this.getCodeChallengeMethod(parameters);

    Object.assign<CodeIdTokenTokenAuthorizationContext, Partial<CodeIdTokenTokenAuthorizationContext>>(context, {
      codeChallenge,
      codeChallengeMethod,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'a6615e1a-38b0-4e6c-b61d-25de850015bd', {
      request,
      context,
    });

    return context;
  }

  /**
   * Checks if the provided scope is supported by the Identity Provider and if the Client is allowed to request it,
   * then return the granted scopes for further processing.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @throws {AccessDeniedError} The Client is not allowed to request the provided Scope.
   * @throws {InvalidRequestError} The provided parameter "scope" is invalid.
   * @throws {InvalidScopeError} The Client requested an unsupported Scope.
   * @returns Scopes granted to the Client.
   */
  protected override async getScopes(
    parameters: CodeIdTokenTokenAuthorizationRequest,
    client: Client,
  ): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '7aa00897-4f42-4bd3-8742-32a29a02ae85', {
      parameters,
      client_id: client.id,
    });

    const scopes = await super.getScopes(parameters, client);
    const allowedScopes = scopes.map((scope) => scope.name);

    if (!allowedScopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required Scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required Scope "openid"`,
        'df69b66b-5ccf-42d2-92fe-c4b37cf62cce',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '112994ce-db54-4865-b29e-75fa438c2511', {
      parameters,
      client_id: client.id,
      allowed_scopes: allowedScopes,
    });

    return scopes;
  }

  /**
   * Checks and returns the Nonce provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "nonce" is invalid.
   * @returns Nonce provided by the Client.
   */
  protected override getNonce(parameters: CodeIdTokenTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, '45a87702-7501-48a9-8f21-86211d93ba31', {
      parameters,
    });

    if (!('nonce' in parameters) || !isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        '54a7fb4a-fa79-4283-a5f7-a7ef190a5ee5',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, '1cd528c5-ae99-42e4-a510-4459cfceb696', {
      parameters,
      nonce,
    });

    return nonce;
  }

  /**
   * Retrieves the Code Challenge provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "code_challenge" is invalid.
   * @returns Code Challenge provided by the Client.
   */
  protected getCodeChallenge(parameters: CodeIdTokenTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getCodeChallenge()`, '52dc2eff-2dc6-49d6-bfed-d11342ebb095', {
      parameters,
    });

    if (!isNonEmptyString(parameters.code_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge"`,
        '799109fc-adc1-4a0b-b444-a6f9f155e6d2',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallenge = parameters.code_challenge;

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallenge()`,
      '677aadf8-3b90-49a5-affd-b658fc57f08b',
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
  protected getCodeChallengeMethod(parameters: CodeIdTokenTokenAuthorizationRequest): PKCE {
    this.logger.debug(
      `[${this.constructor.name}] Called getCodeChallengeMethod()`,
      '6b1bd0a9-4f2d-4a0f-b834-9cdda530d7d4',
      { parameters },
    );

    if ('code_challenge_method' in parameters && !isNonEmptyString(parameters.code_challenge_method)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge_method"`,
        'd432637d-b084-485f-bf5e-b81419b2df6a',
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
        '916044ee-49d8-420c-8870-0c4fae9ba2ad',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallengeMethod()`,
      '0b7e06eb-1cb4-4864-9eae-6bbc30932505',
      { parameters, code_challenge_method: codeChallengeMethod },
    );

    return codeChallengeMethod;
  }
}
