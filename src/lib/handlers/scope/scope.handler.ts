import { Inject, Injectable } from '@guarani/di';

import { Client } from '../../entities/client';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidScopeError } from '../../errors/invalid-scope/invalid-scope.error';
import { Logger } from '../../logger/logger';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';

/**
 * Handler used to aggregate the Scope operations of the Identity Provider.
 */
@Injectable()
export class ScopeHandler {
  /**
   * Instantiates a new Scope Handler.
   *
   * @param logger Logger of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    @Inject(SETTINGS) private readonly settings: Settings,
  ) {}

  /**
   * Checks if the Scopes requested by the Client are supported by the Identity Provider.
   *
   * @param scopes Scopes requested by the Client.
   * @throws {InvalidScopeError} The Client requested an unsupported Scope.
   */
  public checkRequestedScope(scopes: string[]): void {
    this.logger.debug(
      `[${this.constructor.name}] Called checkRequestedScope()`,
      '92a01280-8253-4ae6-a0ec-15e9bfaa720f',
      { requested_scopes: scopes },
    );

    scopes.forEach((scope) => {
      if (!this.settings.scopes.has(scope)) {
        const error = new InvalidScopeError(`Unsupported Scope "${scope}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported Scope "${scope}"`,
          '572f1f77-cf6d-463e-9c87-7a81bd69b851',
          { requested_scopes: scopes, scopes: Array.from(this.settings.scopes) },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed checkRequestedScope()`,
      '0d2df679-0ceb-446c-89ff-177824013697',
      { requested_scopes: scopes },
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
  public getAllowedScopes(client: Client, scopes: string[]): string[] {
    this.logger.debug(`[${this.constructor.name}] Called getAllowedScopes()`, '6f0da132-367c-4f7c-bf83-95a6fc655f28', {
      client,
      requested_scopes: scopes,
    });

    if (scopes.length === 0) {
      this.logger.debug(
        `[${this.constructor.name}] Completed getAllowedScopes()`,
        '0b453fad-5cfd-4003-aa6d-93bbd8a6f7f9',
        { client, requested_scopes: scopes, allowed_scopes: client.scopes },
      );

      return client.scopes;
    }

    const allowedScopes = scopes.map((scope) => {
      if (!client.scopes.includes(scope)) {
        const error = new AccessDeniedError(`The Client is not allowed to request the Scope "${scope}".`);

        this.logger.error(
          `[${this.constructor.name}] The Client is not allowed to request the Scope "${scope}"`,
          '345c0252-3622-460b-a940-9997c35fee38',
          { client, requested_scopes: scopes, client_scopes: client.scopes },
          error,
        );

        throw error;
      }

      return scope;
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed getAllowedScopes()`,
      '0ed273d8-04d3-40ac-b53b-5a8a00ba8034',
      { client, requested_scopes: scopes, allowed_scopes: allowedScopes },
    );

    return allowedScopes;
  }
}
