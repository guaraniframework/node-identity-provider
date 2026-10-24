import { Injectable } from '@guarani/di';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidScopeError } from '../../errors/invalid-scope/invalid-scope.error';
import { Logger } from '../../loggers/logger';

/**
 * Handler used to aggregate the Scope operations of the Identity Provider.
 */
@Injectable()
export class ScopeHandler {
  /**
   * Instantiates a new Scope Handler.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
  ) {}

  /**
   * Checks if the Scopes requested by the Client are supported by the Identity Provider.
   *
   * @param requestedScopes Scopes requested by the Client.
   * @throws {InvalidScopeError} The Client requested an unsupported Scope.
   */
  public async checkRequestedScopes(requestedScopes: string[]): Promise<void> {
    this.logger.debug(
      `[${this.constructor.name}] Called checkRequestedScopes()`,
      '92a01280-8253-4ae6-a0ec-15e9bfaa720f',
      { requested_scopes: requestedScopes },
    );

    const registeredScopes = (await this.dataAccess.getScopes()).map((registeredScope) => registeredScope.name);

    requestedScopes.forEach((requestedScope) => {
      if (!registeredScopes.includes(requestedScope)) {
        const error = new InvalidScopeError(`Unsupported Scope "${requestedScope}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported Scope "${requestedScope}"`,
          '572f1f77-cf6d-463e-9c87-7a81bd69b851',
          { requested_scopes: requestedScopes },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed checkRequestedScopes()`,
      '0d2df679-0ceb-446c-89ff-177824013697',
      { requested_scopes: requestedScopes },
    );
  }

  /**
   * Returns the Scopes that the Client is allowed to use.
   *
   * If the Client requested specific Scopes, this method will return the ones it is allowed to use.
   * Otherwise, it will return all the Scopes registered by the Client.
   *
   * @param client Client of the Http Request.
   * @param scopes Scopes requested by the Client.
   * @throws {AccessDeniedError} The Client is not allowed to request the provided Scope.
   * @returns Scopes that the Client is allowed to use.
   */
  public async getAllowedScopes(client: Client, requestedScopes: string[]): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getAllowedScopes()`, '6f0da132-367c-4f7c-bf83-95a6fc655f28', {
      client_id: client.id,
      requested_scopes: requestedScopes,
    });

    if (requestedScopes.length === 0) {
      this.logger.debug(
        `[${this.constructor.name}] Completed getAllowedScopes()`,
        '0b453fad-5cfd-4003-aa6d-93bbd8a6f7f9',
        {
          client_id: client.id,
          requested_scopes: requestedScopes,
          allowed_scopes: client.scopes.map((scope) => scope.name),
        },
      );

      return client.scopes;
    }

    const clientScopesNames = client.scopes.map((scope) => scope.name);

    const allowedScopes = requestedScopes.map((scope) => {
      if (!clientScopesNames.includes(scope)) {
        const error = new AccessDeniedError(`The Client is not allowed to request the Scope "${scope}".`);

        this.logger.error(
          `[${this.constructor.name}] The Client is not allowed to request the Scope "${scope}"`,
          '345c0252-3622-460b-a940-9997c35fee38',
          { client_id: client.id, requested_scopes: requestedScopes },
          error,
        );

        throw error;
      }

      return scope;
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed getAllowedScopes()`,
      '0ed273d8-04d3-40ac-b53b-5a8a00ba8034',
      { client_id: client.id, requested_scopes: requestedScopes, allowed_scopes: allowedScopes },
    );

    return await this.dataAccess.getScopesByName(allowedScopes);
  }
}
