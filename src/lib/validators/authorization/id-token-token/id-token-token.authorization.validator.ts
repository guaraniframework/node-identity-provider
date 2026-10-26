import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { IdTokenTokenAuthorizationContext } from '../../../context/authorization/id-token-token/id-token-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../loggers/logger';
import { IdTokenTokenAuthorizationRequest } from '../../../requests/authorization/id-token-token/id-token-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';

/**
 * Implementation of the ID Token & Token Authorization Validator.
 */
@Injectable()
export class IdTokenTokenAuthorizationValidator extends AuthorizationValidator<IdTokenTokenAuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public readonly name: ResponseTypeName = 'id_token token';

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['query'];

  /**
   * Instantiates a new ID Token & Token Authorization Validator.
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
  protected override async getScopes(parameters: IdTokenTokenAuthorizationRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '519764a2-03fa-4e97-8fd8-67111449da39', {
      parameters,
      client_id: client.id,
    });

    const scopes = await super.getScopes(parameters, client);
    const allowedScopes = scopes.map((scope) => scope.name);

    if (!allowedScopes.includes('openid')) {
      const error = new InvalidRequestError('Missing required Scope "openid".');

      this.logger.error(
        `[${this.constructor.name}] Missing required Scope "openid"`,
        'decd0878-ba7e-4bb3-a44a-b400d00a85ad',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '341a70eb-6e9e-4f11-8e30-e0c8249897c2', {
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
  protected override getNonce(parameters: IdTokenTokenAuthorizationRequest): string {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, 'cc9b3fb7-e7fb-46d5-8d87-32e37f796188', {
      parameters,
    });

    if (!('nonce' in parameters) || !isNonEmptyString(parameters.nonce)) {
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
