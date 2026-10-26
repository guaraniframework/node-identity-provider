import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CodeIdTokenAuthorizationContext } from '../../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { CodeIdTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token/code-id-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the Code & ID Token Authorization Validator.
 */
@Injectable()
export class CodeIdTokenAuthorizationValidator extends AuthorizationValidator<CodeIdTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'code id_token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new Code & ID Token Authorization Validator.
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
  public override async validate(request: HttpRequest): Promise<CodeIdTokenAuthorizationContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '7925112d-8169-408c-a878-1be3a2656133', {
      request,
    });

    const context = await super.validate(request);

    const { parameters } = context;

    const codeChallenge = this.getCodeChallenge(parameters);
    const codeChallengeMethod = this.getCodeChallengeMethod(parameters);

    Object.assign<CodeIdTokenAuthorizationContext, Partial<CodeIdTokenAuthorizationContext>>(context, {
      codeChallenge,
      codeChallengeMethod,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '55ecd288-29fc-493c-b665-2b5c37200519', {
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
  protected override async getScopes(parameters: CodeIdTokenAuthorizationRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '48be36c3-5c45-4dfd-829b-b6e40217db1e', {
      parameters,
      client_id: client.id,
    });

    const scopes = await super.getScopes(parameters, client);
    const allowedScopes = scopes.map((scope) => scope.name);

    if (!allowedScopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required Scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required Scope "openid"`,
        '0519720b-d7c3-4edb-9860-4b52dfe24bb9',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '2bf2594b-8964-4ba5-9474-0cd3f92c9cc1', {
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
  protected override getNonce(parameters: CodeIdTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, '3707d474-55bc-408a-a6a2-bec72ebdefac', {
      parameters,
    });

    if (!('nonce' in parameters) || !isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        '43bac8b4-976b-4f64-b83d-9c24496d70d8',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, '2c7c66e4-ec4d-459c-9415-bb35f8592589', {
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
  protected getCodeChallenge(parameters: CodeIdTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getCodeChallenge()`, '68699f0c-b0af-4a32-a739-d38b5b3979b6', {
      parameters,
    });

    if (!isNonEmptyString(parameters.code_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge"`,
        '167ff4fb-5c1b-4326-b1ac-8f88d166f80a',
        { parameters },
        error,
      );

      throw error;
    }

    const codeChallenge = parameters.code_challenge;

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallenge()`,
      '4b632c55-ed66-42e2-99ab-44da4c5d3773',
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
  protected getCodeChallengeMethod(parameters: CodeIdTokenAuthorizationRequest): PKCE {
    this.logger.debug(
      `[${this.constructor.name}] Called getCodeChallengeMethod()`,
      '0f32643f-5086-452c-af82-50169d57b37a',
      { parameters },
    );

    if ('code_challenge_method' in parameters && !isNonEmptyString(parameters.code_challenge_method)) {
      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "code_challenge_method"`,
        '76858191-8ba9-4c96-b078-0f90389557a6',
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
        '1d98304a-401c-48b5-a284-fc16446ec395',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getCodeChallengeMethod()`,
      'fe9875ea-11c4-42c6-8b8d-18fa701b8dc8',
      { parameters, code_challenge_method: codeChallengeMethod },
    );

    return codeChallengeMethod;
  }
}
