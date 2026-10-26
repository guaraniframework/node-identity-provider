import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { IdTokenAuthorizationContext } from '../../../context/authorization/id-token/id-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../loggers/logger';
import { IdTokenAuthorizationRequest } from '../../../requests/authorization/id-token/id-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the ID Token Authorization Validator.
 */
@Injectable()
export class IdTokenAuthorizationValidator extends AuthorizationValidator<IdTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'id_token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new ID Token Authorization Validator.
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
  protected override async getScopes(parameters: IdTokenAuthorizationRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '89d9e34d-cdf3-4525-8999-976f2656bd3c', {
      parameters,
      client_id: client.id,
    });

    const scopes = await super.getScopes(parameters, client);
    const allowedScopes = scopes.map((scope) => scope.name);

    if (!allowedScopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required Scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required Scope "openid"`,
        'a39eab70-3a5b-46f4-85ba-e0d15923b18c',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, 'dac33f50-af06-4fe2-9fa6-b4a078d7041a', {
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
  protected override getNonce(parameters: IdTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, '42bf3068-8a39-4291-8253-d4d26b3af5de', {
      parameters,
    });

    if (!('nonce' in parameters) || !isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        'b47df73e-909f-451d-a6f0-7a2113abe24d',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, '6cb3db8b-31e3-4013-b71b-01a42a126c1a', {
      parameters,
      nonce,
    });

    return nonce;
  }
}
